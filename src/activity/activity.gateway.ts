import { Inject } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectUser } from 'src/project-users/project-user.entity';
import { AuthService } from 'src/users/auth/auth.service';
import { ProjectEvents } from 'src/shared/enums/project-events';
import { User } from 'src/users/users.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UserSession, OnlineUser } from './activity.types';
import { ProjectEventPayloads } from 'test/types/test.socket-events.types';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
})
export class ActivityGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly SESSION_TTL = 30 * 60;
  private readonly PRESENCE_TTL = 60 * 60;
  private readonly OFFLINE_GRACE_PERIOD =
    process.env.NODE_ENV === 'test' ? 100 : 10_000;

  constructor(
    private readonly authService: AuthService,
    @InjectRepository(ProjectUser)
    private readonly projectUserRepo: Repository<ProjectUser>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth.token as string;
      const jwtPayload = await this.authService.validateToken(token);
      const userId = jwtPayload.sub!;

      const user = await this.userRepo.findOneBy({ id: userId });
      if (!user) {
        this.logger.warn(`User not found, disconnecting`);
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      client.data.username = user.username;

      const cacheKey = `ws-session:${userId}`;
      let session = await this.cacheManager.get<UserSession>(cacheKey);

      if (session && this.isSessionValid(session)) {
        session.lastSeen = new Date();
        session.socketIds.push(client.id);

        await this.cacheManager.set(cacheKey, session, this.SESSION_TTL);
        await this.joinProjectRooms(client, session.projectIds);
        await this.markUserOnline(userId, user.username, session.projectIds);

        client.emit('connection_ready', {
          type: 'reconnected',
          projects: session.projectIds,
          sessionAge: this.getSessionAge(session),
        });

        this.logger.info(`User ${user.username} reconnected (${client.id})`);
        return;
      }

      const memberships: ProjectUser[] = await this.projectUserRepo.find({
        where: { userId },
        select: ['projectId'],
        take: 100,
      });

      const projectIds = memberships.map((m) => m.projectId);

      session = {
        userId,
        username: user.username,
        projectIds,
        lastSeen: new Date(),
        socketIds: [client.id],
      };

      await this.cacheManager.set(cacheKey, session, this.SESSION_TTL);
      await this.joinProjectRooms(client, projectIds);
      await this.markUserOnline(userId, user.username, projectIds);

      client.emit('connection_ready', {
        type: 'new_session',
        projects: projectIds,
      });

      this.logger.info(
        `User ${user.username} connected, joined ${projectIds.length} project rooms`,
      );
    } catch (error) {
      this.logger.error(
        `Connection failed for ${client.id}: ${this.getErrorMessage(error)}`,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data.userId as string;
    const username = client.data.username as string;
    if (!userId) return;

    try {
      const cacheKey = `ws-session:${userId}`;
      const session = await this.cacheManager.get<UserSession>(cacheKey);

      if (!session) return;

      session.socketIds = session.socketIds.filter((id) => id !== client.id);
      session.lastSeen = new Date();

      if (session.socketIds.length === 0) {
        await this.cacheManager.set(cacheKey, session, 5 * 60);

        setTimeout(() => {
          void this.checkAndMarkOffline(userId, cacheKey, session.projectIds);
        }, this.OFFLINE_GRACE_PERIOD);

        this.logger.info(
          `User ${username} fully disconnected, grace period started`,
        );
      } else {
        await this.cacheManager.set(cacheKey, session, this.SESSION_TTL);
        this.logger.debug(
          `User ${username} socket closed (${session.socketIds.length} remaining)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Disconnect error for ${userId}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  @SubscribeMessage(ProjectEvents.JOIN_PROJECT)
  async handleJoinProject(
    client: Socket,
    eventPayload: { projectId: string },
  ): Promise<void> {
    const userId = client.data.userId as string;
    const username = client.data.username as string;
    const { projectId } = eventPayload;
    const projectRoom = `project-${projectId}`;

    try {
      const cacheKey = `ws-session:${userId}`;
      const session = await this.cacheManager.get<UserSession>(cacheKey);

      if (!session || !session.projectIds.includes(projectId)) {
        client.emit('error', {
          message: 'Not authorized for this project',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      await client.join(projectRoom);

      client.emit('joinedProject', {
        status: 'success',
        projectId,
      });

      // Notify others in the room
      client.to(projectRoom).emit(ProjectEvents.USER_JOINED_PROJECT, {
        userId,
        username,
        projectId,
      });

      this.logger.debug(`User ${username} joined room ${projectRoom}`);
    } catch (error) {
      this.logger.error(`Join project error: ${this.getErrorMessage(error)}`);
      client.emit('error', { message: 'Failed to join project' });
    }
  }

  @SubscribeMessage('getOnlineUsers')
  async handleGetOnlineUsers(
    client: Socket,
    eventPayload: { projectId: string },
  ): Promise<void> {
    const userId = client.data.userId as string;
    const { projectId } = eventPayload;

    try {
      const cacheKey = `ws-session:${userId}`;
      const session = await this.cacheManager.get<UserSession>(cacheKey);

      if (!session || !session.projectIds.includes(projectId)) {
        client.emit('error', {
          message: 'Not authorized',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const presenceKey = `project-presence:${projectId}`;
      const presence =
        (await this.cacheManager.get<Record<string, OnlineUser>>(
          presenceKey,
        )) || {};

      client.emit('onlineUsers', {
        projectId,
        users: Object.values(presence),
      });
    } catch (error) {
      this.logger.error(
        `Get online users error: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private async markUserOnline(
    userId: string,
    username: string,
    projectIds: string[],
  ): Promise<void> {
    const onlineUser: OnlineUser = {
      userId,
      username,
      joinedAt: new Date(),
    };

    for (const projectId of projectIds) {
      const presenceKey = `project-presence:${projectId}`;
      const presence =
        (await this.cacheManager.get<Record<string, OnlineUser>>(
          presenceKey,
        )) || {};

      const wasAlreadyOnline = !!presence[userId];
      presence[userId] = onlineUser;

      await this.cacheManager.set(presenceKey, presence, this.PRESENCE_TTL);

      if (!wasAlreadyOnline) {
        this.broadcastProjectEntityChange(
          projectId,
          ProjectEvents.USER_ONLINE,
          {
            userId,
            username,
          },
        );
      }
    }
  }

  private async markUserOffline(
    userId: string,
    projectIds: string[],
  ): Promise<void> {
    for (const projectId of projectIds) {
      const presenceKey = `project-presence:${projectId}`;
      const presence =
        await this.cacheManager.get<Record<string, OnlineUser>>(presenceKey);

      if (presence?.[userId]) {
        delete presence[userId];
        await this.cacheManager.set(presenceKey, presence, this.PRESENCE_TTL);

        this.broadcastProjectEntityChange(
          projectId,
          ProjectEvents.USER_OFFLINE,
          {
            userId,
          },
        );
      }
    }
  }

  broadcastProjectEntityChange<E extends ProjectEvents>(
    projectId: string,
    eventName: E,
    payload: ProjectEventPayloads[E],
  ): void {
    const roomName = `project-${projectId}`;
    this.server.to(roomName).emit(eventName, payload);
    this.logger.debug(`Broadcast ${eventName} to ${roomName}`);
  }

  removeProjectRoom(projectId: string): void {
    const roomName = `project-${projectId}`;
    this.server.in(roomName).socketsLeave(roomName);
    this.logger.debug(`Removed room ${roomName}`);
  }

  async invalidateUserSession(userId: string): Promise<void> {
    try {
      const cacheKey = `ws-session:${userId}`;
      const session = await this.cacheManager.get<UserSession>(cacheKey);

      if (!session) {
        this.logger.debug(`No session to invalidate for user ${userId}`);
        return;
      }

      const memberships: ProjectUser[] = await this.projectUserRepo.find({
        where: { userId },
        select: ['projectId'],
        take: 100,
      });

      const oldProjectIds: string[] = session.projectIds;
      const newProjectIds = memberships.map((m) => m.projectId);

      const removedProjects = oldProjectIds.filter(
        (id) => !newProjectIds.includes(id),
      );
      const addedProjects = newProjectIds.filter(
        (id) => !oldProjectIds.includes(id),
      );

      await this.markUserOffline(userId, removedProjects);
      await this.markUserOnline(userId, session.username, addedProjects);

      session.projectIds = newProjectIds;
      session.lastSeen = new Date();
      await this.cacheManager.set(cacheKey, session, this.SESSION_TTL);

      for (const socketId of session.socketIds) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (!socket) continue;

        socket.rooms.forEach((room) => {
          if (room.startsWith('project-')) {
            socket.leave(room);
          }
        });

        await this.joinProjectRooms(socket, newProjectIds);

        socket.emit('permissions_updated', {
          projects: newProjectIds,
        });
      }

      this.logger.info(
        `Session invalidated for user ${userId}, now in ${newProjectIds.length} projects`,
      );
    } catch (error) {
      this.logger.error(
        `Invalidate session error for ${userId}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private async joinProjectRooms(
    client: Socket,
    projectIds: string[],
  ): Promise<void> {
    if (projectIds.length > 0) {
      await Promise.all(projectIds.map((id) => client.join(`project-${id}`)));
    }
  }

  private async checkAndMarkOffline(
    userId: string,
    cacheKey: string,
    projectIds: string[],
  ): Promise<void> {
    const currentSession = await this.cacheManager.get<UserSession>(cacheKey);
    if (currentSession && currentSession.socketIds.length === 0) {
      await this.markUserOffline(userId, projectIds);
    }
  }

  private isSessionValid(session: UserSession): boolean {
    const sessionAge = Date.now() - new Date(session.lastSeen).getTime();
    return sessionAge < this.SESSION_TTL * 1000;
  }

  private getSessionAge(session: UserSession): number {
    const sessionAge = Date.now() - new Date(session.lastSeen).getTime();
    return Math.floor(sessionAge / 1000);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Unknown error';
  }
}

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

export interface UserSession {
  userId: string;
  projectIds: string[];
  lastSeen: Date;
  socketIds: string[];
}

@WebSocketGateway()
export class ActivityGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly SESSION_TTL = 30 * 60;

  constructor(
    private readonly authService: AuthService,
    @InjectRepository(ProjectUser)
    private readonly projectUserRepo: Repository<ProjectUser>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token as string;
      const payload = await this.authService.validateToken(token);
      const userId = payload.sub!;
      await this.cacheManager.set('gateway-test', 'from-gateway', 60);
      console.log(this.cacheManager.cacheId());
      client.data.userId = userId;

      const cacheKey = `ws-session:${userId}`;
      let session = await this.cacheManager.get<UserSession>(cacheKey);

      if (session && this.isSessionValid(session)) {
        console.log(`Reconnecting user ${userId} (cached session)`);

        session.lastSeen = new Date();
        session.socketIds.push(client.id);

        await this.cacheManager.set(cacheKey, session, this.SESSION_TTL);

        if (session.projectIds.length > 0) {
          await Promise.all(
            session.projectIds.map((id) => client.join(`project-${id}`)),
          );
        }

        client.emit('connection_ready', {
          type: 'reconnected',
          projects: session.projectIds,
          sessionAge: this.getSessionAge(session),
        });

        return;
      }

      console.log(`New session for user ${userId}`);

      const memberships = await this.projectUserRepo.find({
        where: { userId },
        select: ['projectId'],
        take: 100,
      });

      const projectIds = memberships.map((m) => m.projectId);

      session = {
        userId,
        projectIds,
        lastSeen: new Date(),
        socketIds: [client.id],
      };

      await this.cacheManager.set(cacheKey, session, this.SESSION_TTL);

      if (projectIds.length > 0) {
        await Promise.all(projectIds.map((id) => client.join(`project-${id}`)));
      }

      console.log(`User ${userId} joined ${projectIds.length} project rooms`);

      const cacheResult = await this.cacheManager.get<UserSession>(cacheKey);

      console.log(`Session cached ${cacheResult?.userId}`);

      client.emit('connection_ready', {
        type: 'new_session',
        projects: projectIds,
      });
    } catch (error) {
      const errorMessage = this.isErrorWithMessage(error)
        ? error.message
        : 'Unknown authentication error';

      console.error(
        `Socket connection failed for client ${client.id}: ${errorMessage}`,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const cacheKey = `ws-session:${userId}`;
      const session = await this.cacheManager.get<UserSession>(cacheKey);

      if (!session) return;

      session.socketIds = session.socketIds.filter((id) => id !== client.id);

      console.log(
        `User ${userId} disconnected (${session.socketIds.length} sockets remaining)`,
      );

      if (session.socketIds.length === 0) {
        await this.cacheManager.set(cacheKey, session, 5 * 60);
        console.log(`User ${userId} session kept for 5 minutes`);
      } else {
        await this.cacheManager.set(cacheKey, session, this.SESSION_TTL);
      }
    } catch (error) {
      console.error(`Error handling disconnect for user ${userId}:`, error);
    }
  }

  @SubscribeMessage(ProjectEvents.JOIN_PROJECT)
  async handleJoinProject(
    client: Socket,
    payload: { projectId: string },
  ): Promise<void> {
    const userId = client.data.userId;
    const projectRoom = `project-${payload.projectId}`;

    try {
      const cacheKey = `ws-session:${userId}`;
      const session = await this.cacheManager.get<UserSession>(cacheKey);

      if (!session || !session.projectIds.includes(payload.projectId)) {
        client.emit('error', {
          message: 'Not authorized for this project',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      console.log(`Client ${client.id} joined room: ${projectRoom}`);

      client.to(projectRoom).emit('userActiveInProject', {
        userId,
        projectId: payload.projectId,
      });

      client.emit('joinedProject', {
        status: 'success',
        projectId: payload.projectId,
      });
    } catch (error) {
      console.error('Error in handleJoinProject:', error);
      client.emit('error', { message: 'Failed to join project' });
    }
  }

  async invalidateUserSession(userId: string): Promise<void> {
    try {
      const cacheKey = `ws-session:${userId}`;
      const session = await this.cacheManager.get<UserSession>(cacheKey);

      if (!session) {
        console.log(`No session to invalidate for user ${userId}`);
        return;
      }

      console.log(`Invalidating session for user ${userId}`);

      const memberships = await this.projectUserRepo.find({
        where: { userId },
        select: ['projectId'],
        take: 100,
      });

      const newProjectIds = memberships.map((m) => m.projectId);

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

        await Promise.all(
          newProjectIds.map((id) => socket.join(`project-${id}`)),
        );

        socket.emit('permissions_updated', {
          projects: newProjectIds,
        });
      }

      console.log(
        `Session invalidated for user ${userId}, rejoined ${newProjectIds.length} rooms`,
      );
    } catch (error) {
      console.error(`Error invalidating session for user ${userId}:`, error);
    }
  }

  broadcastProjectEntityChange(
    projectId: string,
    eventName: ProjectEvents,
    payload: any,
  ): void {
    const roomName = `project-${projectId}`;
    this.server.to(roomName).emit(eventName, payload);
    console.log(`Broadcast to room ${roomName}: ${eventName}`);
  }

  private isSessionValid(session: UserSession): boolean {
    const now = new Date().getTime();
    const sessionAge = now - new Date(session.lastSeen).getTime();
    return sessionAge < this.SESSION_TTL * 1000;
  }

  private getSessionAge(session: UserSession): number {
    const now = new Date().getTime();
    const sessionAge = now - new Date(session.lastSeen).getTime();
    return Math.floor(sessionAge / 1000);
  }

  private isErrorWithMessage(error: unknown): error is { message: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as any).message === 'string'
    );
  }
}

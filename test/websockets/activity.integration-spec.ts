/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Server as HttpServer } from 'http';
import { AppModule } from 'src/app.module';
import { ProjectDto } from 'src/projects/dtos/project.dto';
import {
  defaultUser,
  dummyEpics,
  dummyProjects,
  secondUser,
  unauthorizedUser,
} from '../dummy-variables/dummy-variables';
import {
  createProject,
  createProjectUser,
  registerAndLogin,
} from '../helpers/test-helpers';
import { TestSetup } from '../test.setup';
import * as request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { IoServerAdapter } from './io-server.adapter';
import { ProjectEvents } from 'src/shared/enums/project-events';
import { EpicDto } from 'src/epics/dtos/epic.dto';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ProjectRole } from 'src/project-users/project-role.enum';
import { CreateProjectUserInput } from 'src/project-users/dtos/create-project-user.dto';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { UserSession } from 'src/activity/activity.gateway';

const FALLBACK_WS_PORT = 3001;

const resovleReceivedEvent = async (
  clientSocket: Socket,
  event: ProjectEvents,
): Promise<any> => {
  return new Promise<any>((resolve) => {
    clientSocket.once(event, (payload) => {
      resolve(payload);
    });
  });
};
type ClientSocket = Socket;

describe('Activity Integration', () => {
  let testSetup: TestSetup;
  let cacheManager: Cache;
  let accessToken1: string;
  let accessToken2: string;
  let userId1: string;
  let userId2: string;
  let server: HttpServer;
  let baseUrl: string;
  let projectId: string;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;
  let WS_URL: string;

  jest.setTimeout(15000);

  beforeAll(async () => {
    testSetup = await TestSetup.create(AppModule);
    cacheManager = testSetup.app.get(CACHE_MANAGER);
    testSetup.app.useWebSocketAdapter(new IoServerAdapter(testSetup.app));

    await testSetup.app.listen(FALLBACK_WS_PORT);
    server = testSetup.app.getHttpServer() as HttpServer;

    const address = server.address();
    const port =
      typeof address === 'object' && address?.port
        ? address.port
        : FALLBACK_WS_PORT;
    WS_URL = `http://localhost:${port}`;
  });

  beforeEach(async () => {
    const token1 = await registerAndLogin(server, { ...defaultUser });
    accessToken1 = token1;

    const token2 = await registerAndLogin(server, { ...secondUser });
    accessToken2 = token2;

    const projectRes = await createProject(server, token1, dummyProjects[0]);
    const projectBody = projectRes.body as ProjectDto;
    projectId = projectBody.id;
    baseUrl = `/projects/${projectBody.id}`;

    const jwtService = testSetup.app.get(JwtService);

    userId1 = jwtService.verify(token1).sub;
    userId2 = jwtService.verify(token2).sub;

    const variables = {
      projectId,
      input: {
        userId: userId2,
        role: ProjectRole.ADMIN,
      } satisfies CreateProjectUserInput,
    };

    await createProjectUser(server, variables, token1);

    clientSocket1 = io(WS_URL, {
      transports: ['websocket'],
      timeout: 1000,
      auth: { token: token1 },
    });

    await connectClientAndJoinProject(clientSocket1, projectId);

    clientSocket2 = io(WS_URL, {
      transports: ['websocket'],
      timeout: 1000,
      auth: { token: token2 },
    });

    await connectClientAndJoinProject(clientSocket2, projectId);
  });

  async function connectClientAndJoinProject(clientSocket: Socket, id: string) {
    await new Promise<void>((resolve, reject) => {
      let resolved = false;
      const roomJoinTimeout = 4000;
      const connectionTimeout = 5000;

      const rejectWithError = (message: string) => {
        if (!resolved) {
          resolved = true;
          reject(new Error(message));
        }
      };

      clientSocket.on('connect_error', (err: Error) => {
        rejectWithError(`Socket connection error: ${err.message}`);
      });

      clientSocket.on('connect', () => {
        clientSocket.on('connection_ready', () => {
          clientSocket.emit('joinProject', { projectId: id });

          clientSocket.on('joinedProject', () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          });

          setTimeout(() => {
            rejectWithError(
              'WebSocket connection successful but "joinedProject" event timed out.',
            );
          }, roomJoinTimeout);
        });
      });

      setTimeout(() => {
        if (!resolved)
          rejectWithError('WebSocket connection attempt timed out.');
      }, connectionTimeout);
    });
  }

  afterEach(async () => {
    if (clientSocket1 && clientSocket1.connected) {
      clientSocket1.disconnect();
    }
    if (clientSocket2 && clientSocket2.connected) {
      clientSocket2.disconnect();
    }

    await cacheManager.del(`ws-session:${userId1}`);
    await cacheManager.del(`ws-session:${userId2}`);

    await testSetup.cleanup();
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      if (server) {
        server.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      } else {
        resolve();
      }
    });
    await testSetup.teardown();
  });

  const setRaceTimeout = (broadcastTimeoutMs: number) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(`Broadcast timed out after ${broadcastTimeoutMs}ms`),
          ),
        broadcastTimeoutMs,
      ),
    );
    return timeout;
  };

  it('should reject connection if token is invalid or missing', async () => {
    const badToken = randomUUID();
    const clientSocketBadToken = io(WS_URL, {
      transports: ['websocket'],
      timeout: 1000,
      auth: { token: badToken },
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await new Promise((resolve) =>
      clientSocketBadToken.on('disconnect', resolve),
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Socket connection failed for client'),
    );

    consoleSpy.mockRestore();
    clientSocketBadToken.disconnect();
  });

  it('should broadcast the payload to ALL clients in the project room', async () => {
    const expectedEvent = ProjectEvents.PROJECT_UPDATED;
    const updatePayload = { name: 'Updated Name for Both' };

    const receivedEvent1Promise = resovleReceivedEvent(
      clientSocket1,
      expectedEvent,
    );

    const receivedEvent2Promise = resovleReceivedEvent(
      clientSocket2,
      expectedEvent,
    );

    await request(server)
      .patch(baseUrl)
      .set('Authorization', `Bearer ${accessToken1}`)
      .send(updatePayload)
      .expect(200);

    const timeout = setRaceTimeout(2000);

    const raceResults = await Promise.race([
      Promise.all([receivedEvent1Promise, receivedEvent2Promise]),
      timeout,
    ]);

    expect(raceResults).toBeInstanceOf(Array);
    const [payload1, payload2] = raceResults as [any, any];

    expect(payload1).toBeDefined();
    expect(payload1.name).toBe(updatePayload.name);

    expect(payload2).toBeDefined();
    expect(payload2.name).toBe(updatePayload.name);
  });

  it('should block project join attempt of non project user', async () => {
    const unauthorizedToken = await registerAndLogin(server, unauthorizedUser);
    const unauthorizedSocket = io(WS_URL, {
      transports: ['websocket'],
      auth: { token: unauthorizedToken },
    });

    let receivedSuccess = false;

    unauthorizedSocket.once('joinedProject', () => {
      receivedSuccess = true;
    });

    await new Promise<void>((resolve) => {
      unauthorizedSocket.once('connect', () => {
        console.log('connect works');
        unauthorizedSocket.once('connection_ready', () => {
          console.log('connection ready worked');
          unauthorizedSocket.emit('joinProject', projectId);
          resolve();
        });
      });
    });

    expect(receivedSuccess).toBe(false);

    unauthorizedSocket.disconnect();
  });

  it('should not broadcast payload to other projects', async () => {
    const expectedEvent = ProjectEvents.EPIC_CREATED;
    const otherProjectToken = await registerAndLogin(server, unauthorizedUser);
    const projectData = await createProject(
      server,
      otherProjectToken,
      dummyProjects[1],
    );

    const project = projectData.body as ProjectDto;

    const unauthorizedSocket = io(WS_URL, {
      transports: ['websocket'],
      auth: { token: otherProjectToken },
    });

    await connectClientAndJoinProject(unauthorizedSocket, project.id);

    const receivedEvent1 = resovleReceivedEvent(clientSocket1, expectedEvent);

    let unauthorizedReceivedPayload = null;
    await new Promise<void>((resolve) => {
      unauthorizedSocket.once(expectedEvent, (data) => {
        unauthorizedReceivedPayload = data;
      });
      resolve();
    });

    const epicPayload = { ...dummyEpics[0] };

    await request(server)
      .post(`${baseUrl}/epics`)
      .set('Authorization', `Bearer ${accessToken1}`)
      .send(epicPayload)
      .expect(201);

    const timeout = new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `Timeout: ${expectedEvent} not received by clientSocket1`,
            ),
          ),
        3000,
      ),
    );

    try {
      const payload = await Promise.race([receivedEvent1, timeout]);
      expect(payload).toBeDefined();
      expect(payload.description).toBe(epicPayload.description);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(unauthorizedReceivedPayload).toBeNull();
    } catch (error: any) {
      console.log(error);
    } finally {
      unauthorizedSocket.disconnect();
    }
  });

  describe('Websocket caching', () => {
    it('should cache user session on first connect', async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));

      const cacheKey = `ws-session:${userId1}`;
      const session = await cacheManager.get(cacheKey);

      expect(session).not.toBeNull();
      expect(session).toBeTruthy();
    });

    it('should cache user session on first connect', async () => {
      const session = (await cacheManager.get(
        `ws-session:${userId1}`,
      )) as UserSession;

      expect(session).toBeDefined();
      expect(session.projectIds).toContain(projectId);
    });

    it('should use cached session on reconnect', async () => {
      clientSocket1.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const sessionBefore = await cacheManager.get(`ws-session:${userId1}`);
      expect(sessionBefore).toBeDefined();

      type eventType = {
        type: string;
        projects: string[];
        session: number;
      };

      const newSocket = io(WS_URL, { auth: { token: accessToken1 } });
      const event: eventType = await new Promise((resolve) => {
        newSocket.once('connection_ready', resolve);
      });

      expect(event.type).toBe('reconnected');

      newSocket.disconnect();
      clientSocket1 = newSocket;
    });

    it('should track multiple sockets for same user', async () => {
      const tab2Socket = io(WS_URL, { auth: { token: accessToken1 } });
      await new Promise((resolve) => {
        tab2Socket.once('connection_ready', resolve);
      });

      const session = (await cacheManager.get(
        `ws-session:${userId1}`,
      )) as UserSession;
      expect(session.socketIds).toHaveLength(2);
      expect(session.socketIds).toContain(clientSocket1.id);
      expect(session.socketIds).toContain(tab2Socket.id);

      tab2Socket.disconnect();
    });
  });

  describe('Websocket projects', () => {
    it('should broadcast a PROJECT_UPDATED event after an update', async () => {
      const expectedEvent = ProjectEvents.PROJECT_UPDATED;

      const receivedEvent = resovleReceivedEvent(clientSocket1, expectedEvent);

      const updatePayload = { name: 'New Project Name' };

      await request(server)
        .patch(baseUrl)
        .set('Authorization', `Bearer ${accessToken1}`)
        .send(updatePayload)
        .expect(200);

      const broadcastTimeoutMs = 1500;
      const timeout = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `WebSocket event "${expectedEvent}" broadcast timed out after ${broadcastTimeoutMs}ms`,
              ),
            ),
          broadcastTimeoutMs,
        ),
      );

      const broadcastPayload = await Promise.race([receivedEvent, timeout]);

      expect(broadcastPayload).toBeDefined();
      expect(broadcastPayload.id).toBe(projectId);
      expect(broadcastPayload.name).toBe(updatePayload.name);
      expect(broadcastPayload.description).toBe(dummyProjects[0].description);
    });
  });

  describe('Websocket epics', () => {
    it('should broadcast epicCreated to all clients in the project room', async () => {
      const expectedEvent = ProjectEvents.EPIC_CREATED;

      const receivedEvent1Promise = resovleReceivedEvent(
        clientSocket1,
        expectedEvent,
      );

      const receivedEvent2Promise = resovleReceivedEvent(
        clientSocket2,
        expectedEvent,
      );

      const epicInput = { ...dummyEpics[0] };

      const res = await request(server)
        .post(`${baseUrl}/epics`)
        .set('Authorization', `Bearer ${accessToken1}`)
        .send(epicInput)
        .expect(201);

      const epic = res.body as EpicDto;

      expect(epic.name).toBe(epicInput.name);
      expect(epic.priority).toBe(epicInput.priority);

      const timeout = setRaceTimeout(2000);

      const raceResults = await Promise.race([
        Promise.all([receivedEvent1Promise, receivedEvent2Promise]),
        timeout,
      ]);

      expect(raceResults).toBeInstanceOf(Array);
      const [payload1, payload2] = raceResults as EpicDto[];

      expect(payload1).toBeDefined();
      expect(payload1).toEqual(epic);

      expect(payload2).toBeDefined();
      expect(payload2).toEqual(epic);
    });

    it('should broadcast epicUpdated to all clients in the project room', async () => {
      const expectedEvent = ProjectEvents.EPIC_UPDATED;

      const receivedEvent1Promise = resovleReceivedEvent(
        clientSocket1,
        expectedEvent,
      );

      const receivedEvent2Promise = resovleReceivedEvent(
        clientSocket2,
        expectedEvent,
      );

      const res = await request(server)
        .post(`${baseUrl}/epics`)
        .set('Authorization', `Bearer ${accessToken1}`)
        .send({ ...dummyEpics[0] })
        .expect(201);

      const resBody = res.body as EpicDto;

      const updatePayload = { description: 'New Project Name' };

      await request(server)
        .patch(`${baseUrl}/epics/${resBody.id}`)
        .set('Authorization', `Bearer ${accessToken1}`)
        .send(updatePayload)
        .expect(200);

      const timeout = setRaceTimeout(2000);

      const raceResults = await Promise.race([
        Promise.all([receivedEvent1Promise, receivedEvent2Promise]),
        timeout,
      ]);

      expect(raceResults).toBeInstanceOf(Array);

      const [payload1, payload2] = raceResults as EpicDto[];

      expect(payload1).toBeDefined();
      expect(payload1.name).toBe(dummyEpics[0].name);
      expect(payload1.description).toBe(updatePayload.description);

      expect(payload2).toBeDefined();
      expect(payload2.description).toBe(updatePayload.description);
    });

    it('should broadcast epicDeleted to all clients in the project room', async () => {
      const expectedEvent = ProjectEvents.EPIC_DELETED;

      const receivedEvent1Promise = resovleReceivedEvent(
        clientSocket1,
        expectedEvent,
      );

      const receivedEvent2Promise = resovleReceivedEvent(
        clientSocket2,
        expectedEvent,
      );

      const res = await request(server)
        .post(`${baseUrl}/epics`)
        .set('Authorization', `Bearer ${accessToken1}`)
        .send({ ...dummyEpics[0] })
        .expect(201);

      const resBody = res.body as EpicDto;

      await request(server)
        .delete(`${baseUrl}/epics/${resBody.id}`)
        .set('Authorization', `Bearer ${accessToken1}`)
        .expect(204);

      const timeout = setRaceTimeout(2000);

      const raceResults = await Promise.race([
        Promise.all([receivedEvent1Promise, receivedEvent2Promise]),
        timeout,
      ]);

      expect(raceResults).toBeInstanceOf(Array);

      const [payload1, payload2] = raceResults as [any, any];

      expect(payload1).toBeDefined();
      expect(payload1.epicId).toBe(resBody.id);

      expect(payload2).toBeDefined();
      expect(payload2.epicId).toBe(resBody.id);
    });
  });
});

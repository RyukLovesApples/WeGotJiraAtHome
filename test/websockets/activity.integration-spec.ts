import { Server as HttpServer } from 'http';
import { AppModule } from 'src/app.module';
import { ProjectDto } from 'src/projects/dtos/project.dto';
import {
  defaultUser,
  dummyEpics,
  dummyProjects,
  dummyTasks,
  secondUser,
  thirdUser,
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
import { OnlineUser, UserSession } from 'src/activity/activity.types';
import { fail } from 'assert';
import {
  ProjectEventPayloads,
  TypedClientSocket,
} from 'test/types/test.socket-events.types';
import { JwtPayload } from 'jsonwebtoken';
import { TaskDto } from 'src/tasks/dtos/task.dto';

const FALLBACK_WS_PORT = 3001;

const resolveReceivedEvent = <E extends ProjectEvents>(
  clientSocket: TypedClientSocket,
  event: E,
): Promise<ProjectEventPayloads[E]> => {
  return new Promise((resolve) => {
    (clientSocket as any).once(event, (payload: ProjectEventPayloads[E]) => {
      resolve(payload);
    });
  });
};

describe('Activity Integration', () => {
  let testSetup: TestSetup;
  let cacheManager: Cache;
  let accessToken1: string;
  let userId1: string;
  let userId2: string;
  let server: HttpServer;
  let baseUrl: string;
  let projectId: string;
  let clientSocket1: TypedClientSocket;
  let clientSocket2: TypedClientSocket;
  let WS_URL: string;

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

    const projectRes = await createProject(server, token1, dummyProjects[0]);
    const projectBody = projectRes.body as ProjectDto;
    projectId = projectBody.id;
    baseUrl = `/projects/${projectBody.id}`;

    const jwtService = testSetup.app.get(JwtService);

    const payload1: JwtPayload = jwtService.verify(token1);
    const payload2: JwtPayload = jwtService.verify(token2);

    userId1 = payload1.sub as string;
    userId2 = payload2.sub as string;

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
    }) as TypedClientSocket;

    await connectClientAndJoinProject(clientSocket2, projectId);
  });

  async function connectClientAndJoinProject(clientSocket: Socket, id: string) {
    await new Promise<void>((resolve, reject) => {
      let resolved = false;
      const roomJoinTimeout = 2000;
      const connectionTimeout = 2000;

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
    let timeoutId: NodeJS.Timeout;

    const promise = new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        console.log('Race condition timed out');
        resolve(null);
      }, broadcastTimeoutMs);
    });

    return { promise, cleanup: () => clearTimeout(timeoutId) };
  };

  it('should reject connection if token is invalid', async () => {
    const badToken = randomUUID();
    const clientSocketBadToken = io(WS_URL, {
      transports: ['websocket'],
      timeout: 1000,
      auth: { token: badToken },
    });

    await expect(
      connectClientAndJoinProject(clientSocketBadToken, projectId),
    ).rejects.toThrow();

    expect(clientSocketBadToken.connected).toBe(false);

    clientSocketBadToken.disconnect();
  });

  it('should broadcast the payload to ALL clients in the project room', async () => {
    const expectedEvent = ProjectEvents.PROJECT_UPDATED;
    const updatePayload = { name: 'Updated Name for Both' };

    const receivedEvent1Promise = resolveReceivedEvent(
      clientSocket1,
      expectedEvent,
    );

    const receivedEvent2Promise = resolveReceivedEvent(
      clientSocket2,
      expectedEvent,
    );

    await request(server)
      .patch(baseUrl)
      .set('Authorization', `Bearer ${accessToken1}`)
      .send(updatePayload)
      .expect(200);

    const timeout = setRaceTimeout(2000);

    try {
      const raceResults = await Promise.race([
        Promise.all([receivedEvent1Promise, receivedEvent2Promise]),
        timeout.promise,
      ]);

      expect(raceResults).toBeInstanceOf(Array);
      const [payload1, payload2] = raceResults as [any, any];

      expect(payload1).toBeDefined();
      expect(payload1.name).toBe(updatePayload.name);

      expect(payload2).toBeDefined();
      expect(payload2.name).toBe(updatePayload.name);
    } finally {
      timeout.cleanup();
    }
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

    const receivedEvent1 = resolveReceivedEvent(clientSocket1, expectedEvent);

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

    const timeout = setRaceTimeout(2000);

    try {
      const payload = (await Promise.race([
        receivedEvent1,
        timeout.promise,
      ])) as ProjectDto;

      expect(payload).toBeDefined();
      expect(payload.name).toBe(epicPayload.name);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(unauthorizedReceivedPayload).toBeNull();
    } finally {
      timeout.cleanup();
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

      const receivedEvent = resolveReceivedEvent(clientSocket1, expectedEvent);

      const updatePayload = { name: 'New Project Name' };

      await request(server)
        .patch(baseUrl)
        .set('Authorization', `Bearer ${accessToken1}`)
        .send(updatePayload)
        .expect(200);

      const timeout = setRaceTimeout(1500);

      try {
        const broadcastPayload = (await Promise.race([
          receivedEvent,
          timeout.promise,
        ])) as ProjectDto;

        expect(broadcastPayload).toBeDefined();
        expect(broadcastPayload.id).toBe(projectId);
        expect(broadcastPayload.name).toBe(updatePayload.name);
        expect(broadcastPayload.description).toBe(dummyProjects[0].description);
      } finally {
        timeout.cleanup();
      }
    });
  });

  describe('Websocket epics', () => {
    it('should broadcast epicCreated to all clients in the project room', async () => {
      const expectedEvent = ProjectEvents.EPIC_CREATED;

      const receivedEvent1Promise = resolveReceivedEvent(
        clientSocket1,
        expectedEvent,
      );

      const receivedEvent2Promise = resolveReceivedEvent(
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

      const timeout = setRaceTimeout(5000);

      try {
        const raceResults = await Promise.race([
          Promise.all([receivedEvent1Promise, receivedEvent2Promise]),
          timeout.promise,
        ]);
        expect(raceResults).toBeInstanceOf(Array);
        const [payload1, payload2] = raceResults as EpicDto[];

        expect(payload1).toBeDefined();
        expect(payload1).toEqual(epic);

        expect(payload2).toBeDefined();
        expect(payload2).toEqual(epic);
      } finally {
        timeout.cleanup();
      }
    });

    it('should broadcast epicUpdated to all clients in the project room', async () => {
      const expectedEvent = ProjectEvents.EPIC_UPDATED;

      const receivedEvent1Promise = resolveReceivedEvent(
        clientSocket1,
        expectedEvent,
      );

      const receivedEvent2Promise = resolveReceivedEvent(
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

      try {
        const raceResults = await Promise.race([
          Promise.all([receivedEvent1Promise, receivedEvent2Promise]),
          timeout.promise,
        ]);

        expect(raceResults).toBeInstanceOf(Array);

        const [payload1, payload2] = raceResults as EpicDto[];

        expect(payload1).toBeDefined();
        expect(payload1.name).toBe(dummyEpics[0].name);
        expect(payload1.description).toBe(updatePayload.description);

        expect(payload2).toBeDefined();
        expect(payload2.description).toBe(updatePayload.description);
      } finally {
        timeout.cleanup();
      }
    });

    it('should broadcast epicDeleted to all clients in the project room', async () => {
      const expectedEvent = ProjectEvents.EPIC_DELETED;

      const receivedEvent1Promise = resolveReceivedEvent(
        clientSocket1,
        expectedEvent,
      );

      const receivedEvent2Promise = resolveReceivedEvent(
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

      try {
        const raceResults = await Promise.race([
          Promise.all([receivedEvent1Promise, receivedEvent2Promise]),
          timeout.promise,
        ]);

        expect(raceResults).toBeInstanceOf(Array);

        const [payload1, payload2] = raceResults as [any, any];

        expect(payload1).toBeDefined();
        expect(payload1.epicId).toBe(resBody.id);

        expect(payload2).toBeDefined();
        expect(payload2.epicId).toBe(resBody.id);
      } finally {
        timeout.cleanup();
      }
    });
  });

  describe('Websocket tasks', () => {
    let epicId: string;
    beforeEach(async () => {
      const epicRes = await request(server)
        .post(`${baseUrl}/epics`)
        .set('Authorization', `Bearer ${accessToken1}`)
        .send({ ...dummyEpics[0] })
        .expect(201);

      const epic = epicRes.body as EpicDto;
      epicId = epic.id;
    });

    it('should broadcast taskCreated to all clients in the project room', async () => {
      const expectedEvent = ProjectEvents.TASK_CREATED;

      const receivedEvent1Promise = resolveReceivedEvent(
        clientSocket1,
        expectedEvent,
      );

      const receivedEvent2Promise = resolveReceivedEvent(
        clientSocket2,
        expectedEvent,
      );

      const taskRes = await request(server)
        .post(`${baseUrl}/epics/${epicId}/tasks`)
        .set('Authorization', `Bearer ${accessToken1}`)
        .send({ ...dummyTasks[0] })
        .expect(201);

      const task = taskRes.body as TaskDto;

      const timeout = setRaceTimeout(1500);

      try {
        const result = await Promise.race([
          Promise.all([receivedEvent1Promise, receivedEvent2Promise]),
          timeout.promise,
        ]);

        const [payload1, payload2] = result as TaskDto[];

        expect(payload1).toEqual(task);
        expect(payload2).toEqual(task);
      } finally {
        timeout.cleanup();
      }
    });

    it('should broadcast taskUpdated to all clients in the project room', async () => {
      const expectedEvent = ProjectEvents.TASK_UPDATED;

      const receivedEvent1Promise = resolveReceivedEvent(
        clientSocket1,
        expectedEvent,
      );

      const receivedEvent2Promise = resolveReceivedEvent(
        clientSocket2,
        expectedEvent,
      );

      const taskCreatedRes = await request(server)
        .post(`${baseUrl}/epics/${epicId}/tasks`)
        .set('Authorization', `Bearer ${accessToken1}`)
        .send({ ...dummyTasks[0] })
        .expect(201);

      const taskCreated = taskCreatedRes.body as TaskDto;

      const updatedPayload = { name: 'Updated Name' };

      const taskUpdated = await request(server)
        .patch(`${baseUrl}/epics/${epicId}/tasks/${taskCreated.id}`)
        .set('Authorization', `Bearer ${accessToken1}`)
        .send(updatedPayload)
        .expect(200);

      const task = taskUpdated.body as TaskDto;

      const timeout = setRaceTimeout(1500);

      try {
        const result = await Promise.race([
          Promise.all([receivedEvent1Promise, receivedEvent2Promise]),
          timeout.promise,
        ]);

        const [payload1, payload2] = result as TaskDto[];

        expect(payload1).toEqual(task);
        expect(payload2).toEqual(task);
      } finally {
        timeout.cleanup();
      }
    });

    it('should broadcast taskDeleted to all clients in the project room', async () => {
      const expectedEvent = ProjectEvents.TASK_DELETED;

      const receivedEvent1Promise = resolveReceivedEvent(
        clientSocket1,
        expectedEvent,
      );

      const receivedEvent2Promise = resolveReceivedEvent(
        clientSocket2,
        expectedEvent,
      );

      const taskRes = await request(server)
        .post(`${baseUrl}/epics/${epicId}/tasks`)
        .set('Authorization', `Bearer ${accessToken1}`)
        .send({ ...dummyTasks[0] })
        .expect(201);

      const task = taskRes.body as TaskDto;
      expect(task).toBeDefined();

      await request(server)
        .delete(`${baseUrl}/epics/${epicId}/tasks/${task.id}`)
        .set('Authorization', `Bearer ${accessToken1}`)
        .expect(204);

      const timeout = setRaceTimeout(1500);

      try {
        const result = await Promise.race([
          Promise.all([receivedEvent1Promise, receivedEvent2Promise]),
          timeout.promise,
        ]);

        const [payload1, payload2] = result as [
          { taskId: string },
          { taskId: string },
        ];

        expect(payload1.taskId).toEqual(task.id);
        expect(payload2.taskId).toEqual(task.id);
      } finally {
        timeout.cleanup();
      }
    });
  });

  describe('Presence', () => {
    it('should broadcast userJoinedProject to other project users', async () => {
      const expectedEvent = ProjectEvents.USER_JOINED_PROJECT;

      const token = await registerAndLogin(server, thirdUser);

      const jwtService = testSetup.app.get(JwtService);
      const userId = jwtService.verify(token).sub as string;

      const variables = {
        projectId,
        input: {
          userId,
          role: ProjectRole.ADMIN,
        } satisfies CreateProjectUserInput,
      };

      await createProjectUser(server, variables, accessToken1);

      const joiningClientSocket = io(WS_URL, {
        transports: ['websocket'],
        timeout: 1000,
        auth: { token },
      });

      const receivedEvent1Promise = resolveReceivedEvent(
        clientSocket1,
        expectedEvent,
      );

      const receivedEvent2Promise = resolveReceivedEvent(
        clientSocket2,
        expectedEvent,
      );

      await connectClientAndJoinProject(joiningClientSocket, projectId);

      const timeout = setRaceTimeout(2000);

      try {
        const resolvedEvents = (await Promise.race([
          Promise.all([receivedEvent1Promise, receivedEvent2Promise]),
          timeout.promise,
        ])) as OnlineUser[];

        const toMatch = { projectId, userId, username: thirdUser.username };

        expect(resolvedEvents).toBeDefined();
        expect(resolvedEvents[1]).toEqual(toMatch);
        expect(resolvedEvents[0]).toEqual(toMatch);
      } finally {
        timeout.cleanup();
        joiningClientSocket.disconnect();
      }
    });

    it('should not broadcast user offline if user closes tab', async () => {
      const expectedEvent = ProjectEvents.USER_OFFLINE;

      const failIfEventReceived = new Promise((_, reject) => {
        clientSocket1.on(expectedEvent, () =>
          reject(new Error('Event was unexpectedly received on socket 1')),
        );
        clientSocket2.on(expectedEvent, () =>
          reject(new Error('Event was unexpectedly received on socket 2')),
        );
      });

      const timeoutDuration = 1500;
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve('TIMEOUT_REACHED'), timeoutDuration),
      );

      const result = await Promise.race([failIfEventReceived, timeoutPromise]);

      expect(result).toBe('TIMEOUT_REACHED');
    });

    it('should broadcast user offline to project users on disconnect after grace period', async () => {
      const expectedEvent = ProjectEvents.USER_OFFLINE;

      const receivedEventPromise = resolveReceivedEvent(
        clientSocket1,
        expectedEvent,
      );

      clientSocket2.disconnect();

      const timeout = setRaceTimeout(11 * 1000);
      const receivedEvent = (await Promise.race([
        receivedEventPromise,
        timeout.promise,
      ])) as { userId: string };
      timeout.cleanup();
      expect(receivedEvent.userId).toBe(userId2);
    });

    it('should set presence cache for joined user', async () => {
      const token = await registerAndLogin(server, thirdUser);

      const jwtService = testSetup.app.get(JwtService);
      const userId = jwtService.verify(token).sub as string;

      const variables = {
        projectId,
        input: {
          userId,
          role: ProjectRole.ADMIN,
        } satisfies CreateProjectUserInput,
      };

      await createProjectUser(server, variables, accessToken1);

      const joiningClientSocket = io(WS_URL, {
        transports: ['websocket'],
        timeout: 1000,
        auth: { token },
      });

      await connectClientAndJoinProject(joiningClientSocket, projectId);

      const presenceCache = await cacheManager.get<Record<string, OnlineUser>>(
        `project-presence:${projectId}`,
      );

      if (!presenceCache) {
        joiningClientSocket.disconnect();
        fail(`Presence cache for user ${userId} not found`);
      }

      const onlineUser = presenceCache[userId];

      expect(onlineUser).toBeDefined();
      expect(onlineUser.userId).toBe(userId);

      joiningClientSocket.disconnect();
    });
  });
});

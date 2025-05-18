import { AppModule } from 'src/app.module';
import { TestSetup } from './test.setup';
import * as request from 'supertest';
import { Task } from 'src/tasks/task.entity';
import { PaginationResponse } from 'src/tasks/pagination.response';
import { Http2Server } from 'http2';
import {
  testUser,
  unauthorizedUser,
  mockTasks,
} from './mockVariables/mockVariables';
import {
  registerAndLogin,
  createTask,
  parseErrorText,
} from './helpers/test-helpers';
import { randomUUID } from 'crypto';
import { TaskStatus } from 'src/tasks/task.model';
import { WrongTaskStatusException } from 'src/tasks/exeptions/wrong-task-status.exeption';
import { TaskLabel } from 'src/tasks/task-label.entity';

describe('Tasks Integration(e2e)', () => {
  let testSetup: TestSetup;
  let accessToken: string | undefined;
  let taskId: string | undefined;
  let server: Http2Server;

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);
    server = testSetup.app.getHttpServer() as Http2Server;
    const response = await createTask(server, testUser, mockTasks[0]);
    taskId = response?.data.id;
    accessToken = response?.token;
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });
  it('/tasks/id (GET), should return task', async () => {
    return request(server)
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: Task }) => {
        expect(res.body).toBeDefined();
        expect(res.body.id).toBeDefined();
        expect(res.body.title).toBe(mockTasks[0].title);
        expect(res.body.description).toBe(mockTasks[0].description);
        expect(res.body.status).toBe(TaskStatus.CLOSED);
        expect(Array.isArray(res.body.labels)).toBe(true);
        expect(res.body.labels?.length).toEqual(0);
      });
  });
  it('/tasks/id (GET), denies access to non-user', async () => {
    const token = await registerAndLogin(server, unauthorizedUser);
    return await request(server)
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect((res: { body: Error }) => {
        expect(res.body.message).toContain(
          'Access to task denied. You are not the owner!',
        );
      });
  });
  it('/tasks/id (GET), should throw not found exception, wrong id', async () => {
    const wrongId = randomUUID();
    const token = await registerAndLogin(server, testUser);
    return await request(server)
      .get(`/tasks/${wrongId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
      .expect((res) => {
        const errorBody = parseErrorText(res);
        expect(errorBody?.message).toContain('Task not found');
      });
  });
  it('/tasks/id (GET), should throw 400 for invalid UUID', async () => {
    return await request(server)
      .get('/tasks/invalid-id')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400)
      .expect((res) => {
        const errorBody = parseErrorText(res);
        expect(errorBody?.message).toContain('id must be a UUID');
      });
  });
  it('/tasks/id (POST), should validate the input, empty title', async () => {
    await registerAndLogin(server, testUser);
    return request(server)
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...mockTasks[0], title: '' })
      .expect(400);
  });
  it('/tasks/id (POST), should validate the input, invalid input type', async () => {
    await registerAndLogin(server, testUser);
    return request(server)
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...mockTasks[0], title: 2 })
      .expect(400);
  });
  it('/tasks/id (PATCH), sould return changed task', async () => {
    return request(server)
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(mockTasks[1])
      .expect(200)
      .expect((res: { body: Task }) => {
        expect(res.body.id).toBe(taskId);
        expect(res.body.title).toBe(mockTasks[1].title);
        expect(res.body.description).toBe(mockTasks[1].description);
      });
  });
  it('/tasks/id (PATCH), should throw custom WrongTaskStatusException', async () => {
    return request(server)
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(mockTasks[2])
      .expect(409)
      .expect((res: { body: WrongTaskStatusException }) => {
        expect(res.body.message).toContain('Cannot change task status from');
      });
  });
  it('/tasks/id (DELETE), should delete task', async () => {
    return request(server)
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });
  it('/tasks/id (DELETE), should throw not found exceptoin', async () => {
    return request(server)
      .delete(`/tasks/${randomUUID()}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
  it('/tasks (GET), should only show list of user tasks', async () => {
    await createTask(server, unauthorizedUser, mockTasks[0], 'noRetrun');
    await createTask(server, testUser, mockTasks[1]);
    const res: { body: PaginationResponse<Task> } = await request(server)
      .get('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toEqual(2);
  });
  it('/tasks (GET), should return user tasks with pagination limit', async () => {
    await Promise.all(
      mockTasks.map((task) => createTask(server, testUser, task)),
    );
    return request(server)
      .get('/tasks?limit=3')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: PaginationResponse<Task> }) => {
        expect(res.body.data.length).toEqual(3);
        expect(res.body.meta.total).toEqual(5);
      });
  });
  it('/tasks (GET), should return user tasks and skip offset, orderBy: createdAt "DESC"', async () => {
    await request(server)
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
    for (const task of mockTasks) {
      await createTask(server, testUser, task);
    }
    return request(server)
      .get('/tasks?limit=3&offset=2')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: PaginationResponse<Task> }) => {
        expect(res.body.data[0].title).toBe(mockTasks[1].title);
        expect(res.body.data[1].title).toBe(mockTasks[0].title);
        expect(res.body.data.length).toEqual(2);
        expect(res.body.meta.total).toEqual(4);
      });
  });
  it('/tasks (GET), should return user tasks orderBy: title "ASC"', async () => {
    await request(server)
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
    for (const task of mockTasks) {
      await createTask(server, testUser, task);
    }
    return request(server)
      .get('/tasks?orderBy=title&sortingOrder=ASC')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: PaginationResponse<Task> }) => {
        expect(res.body.data[0].title).toBe(mockTasks[0].title);
        expect(res.body.data[1].title).toBe(mockTasks[1].title);
        expect(res.body.data[2].title).toBe(mockTasks[2].title);
        expect(res.body.data[3].title).toBe(mockTasks[3].title);
      });
  });
  it('/tasks (GET), should not allow to order by description', async () => {
    await request(server)
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
    for (const task of mockTasks) {
      await createTask(server, testUser, task);
    }
    return request(server)
      .get('/tasks?orderBy=description&sortingOrder=ASC')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: PaginationResponse<Task> }) => {
        expect(res.body.data[0].title).toBe(mockTasks[0].title);
        expect(res.body.data[1].title).toBe(mockTasks[1].title);
        expect(res.body.data[2].title).toBe(mockTasks[2].title);
        expect(res.body.data[3].title).toBe(mockTasks[3].title);
      });
  });
  it('/tasks (GET), should return user tasks with searched word', async () => {
    await Promise.all(
      mockTasks.map((task) => createTask(server, testUser, task)),
    );
    return request(server)
      .get('/tasks?search=keyword')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: PaginationResponse<Task> }) => {
        expect(res.body.data.length).toEqual(2);
      });
  });
  it('/tasks (GET), should return empty array, searched word not found', async () => {
    await Promise.all(
      mockTasks.map((task) => createTask(server, testUser, task)),
    );
    return request(server)
      .get('/tasks?search=notIncluded')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: PaginationResponse<Task> }) => {
        expect(res.body.data.length).toEqual(0);
      });
  });
  it('/tasks (GET), should return user tasks with searched word UPPERCASE', async () => {
    await Promise.all(
      mockTasks.map((task) => createTask(server, testUser, task)),
    );
    return request(server)
      .get('/tasks?search=KEYWORD')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: PaginationResponse<Task> }) => {
        expect(res.body.data.length).toEqual(2);
      });
  });
  it('/tasks (GET), should return user tasks with searched word, orderBy title, limit 3, ASC order', async () => {
    await request(server)
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
    for (const task of mockTasks) {
      await createTask(server, testUser, task);
    }
    return request(server)
      .get('/tasks?search=KEYWORD&orderBy=title&sortingOrder=ASC&limit=3')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: PaginationResponse<Task> }) => {
        expect(res.body.data[0].title).toBe(mockTasks[1].title);
        expect(res.body.data[1].title).toBe(mockTasks[2].title);
        expect(res.body.data.length).toEqual(2);
      });
  });
  it('/tasks/id/labels (POST), should create label', async () => {
    return request(server)
      .post(`/tasks/${taskId}/labels`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([{ name: 'label1' }, { name: 'label2' }])
      .expect(201)
      .expect((res: { body: Task }) => {
        expect(Array.isArray(res.body.labels)).toBe(true);
        expect(res.body.labels?.length).toEqual(2);
      });
  });
  it('/tasks/id (DELETE), should delete labels with task', async () => {
    let labelId;
    await request(server)
      .post(`/tasks/${taskId}/labels`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([{ name: 'label1' }, { name: 'label2' }])
      .expect(201)
      .expect((res: { body: Task }) => {
        labelId = res.body.labels![0].id;
      });
    await request(server)
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    const { dataSource } = testSetup;
    const labels = (await dataSource
      .getRepository(TaskLabel)
      .findOne({ where: { id: labelId } })) as TaskLabel;
    expect(labels).toBe(null);
  });
  it('/tasks/id/labels (DELETE), should delete label from task', async () => {
    const labelId: string[] = [];
    await request(server)
      .post(`/tasks/${taskId}/labels`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([{ name: 'label1' }, { name: 'label2' }])
      .expect(201);
    await request(server)
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect((res: { body: Task }) => {
        expect(res.body.labels![0].name).toContain('label1');
        labelId.push(res.body.labels![0].id);
      });
    await request(server)
      .delete(`/tasks/${taskId}/labels`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(labelId)
      .expect(204);
    return request(server)
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: Task }) => {
        console.log(res.body);
        expect(res.body.labels?.length).toEqual(1);
      });
  });
});

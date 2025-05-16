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
import { registerAndLogin, createTask } from './helpers/test-helpers';

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

  it('/tasks/id, denies access to non-user', async () => {
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
  it('/tasks (GET), should only show list of user tasks', async () => {
    await createTask(server, unauthorizedUser, mockTasks[0], 'noRetrun');
    await createTask(server, testUser, mockTasks[1]);
    const res: { body: PaginationResponse<Task> } = await request(server)
      .get('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
});

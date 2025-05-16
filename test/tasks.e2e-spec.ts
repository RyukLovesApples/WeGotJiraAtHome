import { AppModule } from 'src/app.module';
import { TestSetup } from './test.setup';
import * as request from 'supertest';
import { CreateUserDto } from 'src/users/create-user.dto';
import {
  testUser,
  unauthorizedUser,
  mockTasks,
} from './mockVariables/mockVariables';
import { Task } from 'src/tasks/task.entity';
import { PaginationResponse } from 'src/tasks/pagination.response';
import { CreateTaskDto } from 'src/tasks/create-task.dto';
import { Http2Server } from 'http2';

describe('Tasks Integration(e2e)', () => {
  let testSetup: TestSetup;
  let accessToken: string | undefined;
  let taskId: string | undefined;
  let server: Http2Server;

  interface LoginResponse {
    accessToken: string;
  }

  interface CreateTaskResponse {
    data: Task;
    token: string;
  }

  const registerAndLogin = async (user: CreateUserDto): Promise<string> => {
    await request(server).post('/users/register').send(user);
    const response: { body: LoginResponse } = await request(server)
      .post('/auth/login')
      .send({
        email: user.email,
        password: user.password,
      });
    const token = response.body.accessToken;
    return token;
  };

  const createTask = async (
    user: CreateUserDto,
    task: CreateTaskDto,
    noReturn?: string,
  ): Promise<CreateTaskResponse | void> => {
    const token = await registerAndLogin(user);
    const response: { body: Task } = await request(server)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send(task)
      .expect(201);
    if (!noReturn) return { data: response.body, token };
  };

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);
    server = testSetup.app.getHttpServer() as Http2Server;
    const response = await createTask(testUser, mockTasks[0]);
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
    const token = await registerAndLogin(unauthorizedUser);
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
    await createTask(unauthorizedUser, mockTasks[0], 'noRetrun');
    await createTask(testUser, mockTasks[1]);
    const res: { body: PaginationResponse<Task> } = await request(server)
      .get('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
});

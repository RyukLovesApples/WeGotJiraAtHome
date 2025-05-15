import { AppModule } from 'src/app.module';
import { TestSetup } from './test.setup';
import * as request from 'supertest';
import { CreateUserDto } from 'src/users/create-user.dto';
import { TaskStatus } from 'src/tasks/task.model';
import { Task } from 'src/tasks/task.entity';
import { PaginationResponse } from 'src/tasks/pagination.response';

describe('Tasks (e2e)', () => {
  let testSetup: TestSetup;
  let accessToken: string;
  let taskId: string;

  const testUser: CreateUserDto = {
    username: 'adonis',
    email: 'adonis@test.com',
    password: 'Password123%',
  };

  const mockTasks = [
    {
      title: 'test task 1',
      description: 'testing tasks for crud and access',
      status: TaskStatus.OPEN,
    },
    {
      title: 'test task 2',
      description: 'testing tasks for crud and access',
      status: TaskStatus.OPEN,
    },
    {
      title: 'test task 3',
      description: 'testing tasks for crud and access',
      status: TaskStatus.OPEN,
    },
    {
      title: 'test task 4',
      description: 'testing tasks for crud and access',
      status: TaskStatus.OPEN,
    },
    {
      title: 'test task 5',
      description: 'testing tasks for crud and access',
      status: TaskStatus.OPEN,
    },
  ];

  interface LoginResponse {
    body: { accessToken: string };
  }

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);
    await request(testSetup.app.getHttpServer())
      .post('/users/register')
      .send(testUser);

    const response: LoginResponse = await request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    const token = response.body.accessToken;
    accessToken = token;
    const task: { body: Task } = await request(testSetup.app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'test task',
        description: 'testing tasks for crud and access',
        status: TaskStatus.OPEN,
      });
    taskId = task?.body.id;
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('/tasks/id, should deny access to unauthorized user', async () => {
    const unauthorizedUser = {
      username: 'adonis1',
      email: 'adonis1@test.com',
      password: 'Password123%1',
    };
    await request(testSetup.app.getHttpServer())
      .post('/users/register')
      .send(unauthorizedUser);

    const response: LoginResponse = await request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send({
        email: unauthorizedUser.email,
        password: unauthorizedUser.password,
      });
    const token = response.body.accessToken;

    return await request(testSetup.app.getHttpServer())
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
    const created = await request(testSetup.app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'test task 1',
        description: 'testing tasks for crud and access 1',
        status: TaskStatus.IN_PROGRESS,
      })
      .expect(201);

    const res: { body: PaginationResponse<Task> } = await request(
      testSetup.app.getHttpServer(),
    )
      .get('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    console.log('Fetched tasks response:', res.body);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
});

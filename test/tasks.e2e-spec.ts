import { AppModule } from 'src/app.module';
import { TestSetup } from './test.setup';
import * as request from 'supertest';
import { CreateUserDto } from 'src/users/create-user.dto';
import { TaskStatus } from 'src/tasks/task.model';
import { Task } from 'src/tasks/task.entity';
import { CreateTaskDto } from 'src/tasks/create-task.dto';

describe('Tasks (e2e)', () => {
  let testSetup: TestSetup;
  let accessToken: string;
  let taskId: string;

  const testUser: CreateUserDto = {
    username: 'adonis',
    email: 'adonis@test.com',
    password: 'Password123%',
  };

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
    console.log(task.body);
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
      .expect(200);
  });
});

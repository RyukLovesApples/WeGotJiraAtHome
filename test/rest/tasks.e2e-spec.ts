import { AppModule } from 'src/app.module';
import { TestSetup } from '../test.setup';
import * as request from 'supertest';
import { Task } from 'src/tasks/task.entity';
import { PaginationResponse } from 'src/tasks/responses/pagination.response';
import { Http2Server } from 'http2';
import {
  testUser,
  unauthorizedUser,
  mockTasks,
  mockProjects,
} from '../mockVariables/mockVariables';
import {
  registerAndLogin,
  createTask,
  parseErrorText,
  createProject,
} from '../helpers/test-helpers';
import { randomUUID } from 'crypto';
import { TaskStatus } from 'src/tasks/task-status.enum';
import { WrongTaskStatusException } from 'src/tasks/exceptions/wrong-task-status.exeption';
import { TaskLabel } from 'src/tasks/task-label.entity';
import { ProjectDto } from 'src/projects/dtos/project.dto';
import { ProjectUser } from 'src/project-users/project-user.entity';
import { ProjectRole } from 'src/project-users/project-role.enum';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';

describe('Tasks Integration(e2e)', () => {
  let testSetup: TestSetup;
  let accessToken: string | undefined;
  let taskId: string | undefined;
  let server: Http2Server;
  let baseUrl: string;
  let projectId: string;

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);
    server = testSetup.app.getHttpServer() as Http2Server;
    const token = await registerAndLogin(server, { ...testUser });
    const project = await createProject(server, token, {
      ...mockProjects[0],
      tasks: [{ ...mockTasks[0] }],
    });
    const projectBody = project.body as ProjectDto;
    projectId = projectBody.id;
    baseUrl = `/projects/${projectBody.id}`;
    taskId = projectBody.tasks![0].id;
    accessToken = token;
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });
  it('/tasks/id (GET), should return task', async () => {
    return request(server)
      .get(`${baseUrl}/tasks/${taskId}`)
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
      .get(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401)
      .expect((res: { body: Error }) => {
        expect(res.body.message).toContain('User is not part of project.');
      });
  });
  it('/tasks/id (GET), should throw not found exception, wrong id', async () => {
    const wrongId = randomUUID();
    const token = await registerAndLogin(server, testUser);
    return await request(server)
      .get(`${baseUrl}/tasks/${wrongId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
      .expect((res) => {
        const errorBody = parseErrorText(res);
        expect(errorBody?.message).toContain('Task not found');
      });
  });
  it('/tasks/id (GET), should throw 400 for invalid UUID', async () => {
    return await request(server)
      .get(`${baseUrl}/tasks/invalid_id`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400)
      .expect((res) => {
        const errorBody = parseErrorText(res);
        expect(errorBody?.message).toContain('id must be a UUID');
      });
  });
  it('/tasks (POST), should validate the input, empty title', async () => {
    await registerAndLogin(server, testUser);
    return request(server)
      .post(`${baseUrl}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...mockTasks[0], title: '' })
      .expect(400);
  });
  it('/tasks/id (POST), should validate the input, invalid input type', async () => {
    await registerAndLogin(server, testUser);
    return request(server)
      .post(`${baseUrl}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...mockTasks[0], title: 2 })
      .expect(400);
  });
  it('/tasks/id (PATCH), sould return changed task', async () => {
    return request(server)
      .patch(`${baseUrl}/tasks/${taskId}`)
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
      .patch(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(mockTasks[2])
      .expect(409)
      .expect((res: { body: WrongTaskStatusException }) => {
        expect(res.body.message).toContain('Cannot change task status from');
      });
  });
  it('/tasks/id (DELETE), should delete task', async () => {
    return request(server)
      .delete(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });
  it('/tasks/id (DELETE), should throw not found exceptoin', async () => {
    return request(server)
      .delete(`${baseUrl}/tasks/${randomUUID()}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
  it('/tasks (GET), should only show list of user tasks', async () => {
    const token = await registerAndLogin(server, unauthorizedUser);
    await createProject(server, token, {
      ...mockProjects[0],
      tasks: [mockTasks[0]],
    });
    await createTask(server, testUser, mockTasks[1], baseUrl);
    const res: { body: PaginationResponse<Task> } = await request(server)
      .get(`${baseUrl}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toEqual(2);
  });
  it('/tasks (GET), should return user tasks with pagination limit', async () => {
    await Promise.all(
      mockTasks.map((task) => createTask(server, testUser, task, baseUrl)),
    );
    return request(server)
      .get(`${baseUrl}/tasks?limit=3`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: PaginationResponse<Task> }) => {
        expect(res.body.data.length).toEqual(3);
        expect(res.body.meta.total).toEqual(5);
      });
  });
  it('/tasks (GET), should return user tasks and skip offset, orderBy: createdAt "DESC"', async () => {
    await request(server)
      .delete(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
    for (const task of mockTasks) {
      await createTask(server, testUser, task, baseUrl);
    }
    return request(server)
      .get(`${baseUrl}/tasks?limit=3&offset=2`)
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
      .delete(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
    for (const task of mockTasks) {
      await createTask(server, testUser, task, baseUrl);
    }
    return request(server)
      .get(`${baseUrl}/tasks?orderBy=title&sortingOrder=ASC`)
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
      .delete(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
    for (const task of mockTasks) {
      await createTask(server, testUser, task, baseUrl);
    }
    return request(server)
      .get(`${baseUrl}/tasks?orderBy=description&sortingOrder=ASC`)
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
      mockTasks.map((task) => createTask(server, testUser, task, baseUrl)),
    );
    return request(server)
      .get(`${baseUrl}/tasks?search=keyword`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: PaginationResponse<Task> }) => {
        expect(res.body.data.length).toEqual(2);
      });
  });
  it('/tasks (GET), should return empty array, searched word not found', async () => {
    await Promise.all(
      mockTasks.map((task) => createTask(server, testUser, task, baseUrl)),
    );
    return request(server)
      .get(`${baseUrl}/tasks?search=notIncluded`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: PaginationResponse<Task> }) => {
        expect(res.body.data.length).toEqual(0);
      });
  });
  it('/tasks (GET), should return user tasks with searched word UPPERCASE', async () => {
    await Promise.all(
      mockTasks.map((task) => createTask(server, testUser, task, baseUrl)),
    );
    return request(server)
      .get(`${baseUrl}/tasks?search=KEYWORD`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: PaginationResponse<Task> }) => {
        expect(res.body.data.length).toEqual(2);
      });
  });
  it('/tasks (GET), should return user tasks with searched word, orderBy title, limit 3, ASC order', async () => {
    await request(server)
      .delete(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
    for (const task of mockTasks) {
      await createTask(server, testUser, task, baseUrl);
    }
    return request(server)
      .get(
        `${baseUrl}/tasks?search=KEYWORD&orderBy=title&sortingOrder=ASC&limit=3`,
      )
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
      .post(`${baseUrl}/tasks/${taskId}/labels`)
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
      .post(`${baseUrl}/tasks/${taskId}/labels`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([{ name: 'label1' }, { name: 'label2' }])
      .expect(201)
      .expect((res: { body: Task }) => {
        labelId = res.body.labels![0].id;
      });
    await request(server)
      .delete(`${baseUrl}/tasks/${taskId}`)
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
      .post(`${baseUrl}/tasks/${taskId}/labels`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([{ name: 'label1' }, { name: 'label2' }])
      .expect(201);
    await request(server)
      .get(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect((res: { body: Task }) => {
        expect(res.body.labels?.length).toEqual(2);
        expect(res.body.labels![0].name).toContain('label1');
        labelId.push(res.body.labels![0].id);
      });
    await request(server)
      .delete(`${baseUrl}/tasks/${taskId}/labels`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(labelId)
      .expect(204);
    return request(server)
      .get(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: Task }) => {
        expect(res.body.labels?.length).toEqual(1);
      });
  });
  it('resource guard, resource guard should deny access to a unknown project user', async () => {
    const token = await registerAndLogin(server, unauthorizedUser);
    await createProject(server, token, {
      ...mockProjects[0],
      tasks: [mockTasks[0]],
    });
    await request(server)
      .get(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    await request(server)
      .get(`${baseUrl}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    await request(server)
      .post(`${baseUrl}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send(mockTasks[2])
      .expect(401);
    await request(server)
      .patch(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(mockTasks[1])
      .expect(401);
    await request(server)
      .delete(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
  it('resource guard, new project user of ProjectRole USER should only be able to read from tasks routes', async () => {
    const token = await registerAndLogin(server, unauthorizedUser);
    const { dataSource } = testSetup;
    const projectUserRepo = dataSource.getRepository(ProjectUser);
    const jwtData: JwtPayload = testSetup.app.get(JwtService).verify(token);
    const userId = jwtData.sub;
    const newProjectUserData = {
      userId,
      projectId,
      role: ProjectRole.USER,
    };
    const newProjectUser = projectUserRepo.create(newProjectUserData);
    await projectUserRepo.save(newProjectUser);
    await request(server)
      .get(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(server)
      .get(`${baseUrl}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(server)
      .post(`${baseUrl}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send(mockTasks[2])
      .expect(403);
    await request(server)
      .patch(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(mockTasks[1])
      .expect(403);
    await request(server)
      .delete(`${baseUrl}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});

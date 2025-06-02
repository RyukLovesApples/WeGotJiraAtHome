import * as request from 'supertest';
import { Http2Server } from 'http2';
import { TestSetup } from './test.setup';
import { AppModule } from 'src/app.module';
import { createProject, registerAndLogin } from './helpers/test-helpers';
import {
  mockTasks,
  mockProjects,
  testUser,
} from './mockVariables/mockVariables';
import { ProjectDto } from 'src/projects/dtos/project.dto';
import { TaskDto } from 'src/tasks/dtos/task.dto';
import { TaskStatus } from 'src/tasks/task-status.enum';
import { Repository } from 'typeorm';
import { Task } from 'src/tasks/task.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('Project Integration', () => {
  let testSetup: TestSetup;
  let server: Http2Server;
  let projectId: string;
  let accessToken: string;
  let tasks: TaskDto[];

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);
    server = testSetup.app.getHttpServer() as Http2Server;
    accessToken = await registerAndLogin(server, testUser);
    const project = await createProject(server, accessToken, {
      ...mockProjects[0],
      tasks: [mockTasks[0], mockTasks[1]],
    });
    const projectBody = project.body as ProjectDto;
    projectId = projectBody.id;
    tasks = projectBody.tasks!;
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('/projects (POST), should create project without password exposure', async () => {
    return createProject(server, accessToken, mockProjects[0])
      .expect(201)
      .expect((res: { body: ProjectDto }) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe(mockProjects[0].name);
        expect(res.body.user).toBeDefined();
        expect(res.body.user).not.toHaveProperty('password');
      });
  });
  it('/projects (POST), should create project with tasks', async () => {
    return request(server)
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'test', description: 'test description', tasks: mockTasks })
      .expect(201)
      .expect((res: { body: ProjectDto }) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe('test');
        expect(res.body.user).toBeDefined();
        expect(res.body.tasks?.length).toBe(4);
        expect(res.body.user).not.toHaveProperty('password');
      });
  });
  it('/projects (GET), should return all the user projects', async () => {
    await request(server)
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(mockProjects[1])
      .expect(201);

    return request(server)
      .get('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: ProjectDto[] }) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2);
      });
  });
  it('/projects/id (GET), should return one task without password exposure', async () => {
    console.log(projectId);
    return request(server)
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: ProjectDto }) => {
        expect(res.body.id).toBe(projectId);
        expect(res.body.user).toBeDefined();
        expect(res.body.user).not.toHaveProperty('password');
      });
  });
  it('/projects/id (PATCH), should update project without tasks', async () => {
    return request(server)
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(mockProjects[1])
      .expect(200)
      .expect((res: { body: ProjectDto }) => {
        expect(res.body.name).toBe(mockProjects[1].name);
        expect(res.body.id).toBe(projectId);
        expect(res.body.user).not.toHaveProperty('password');
      });
  });
  it('/projects/id (PATCH), should only update passed properties', async () => {
    return request(server)
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: mockProjects[1].name })
      .expect(200)
      .expect((res: { body: ProjectDto }) => {
        expect(res.body.name).toBe(mockProjects[1].name);
        expect(res.body.description).toBe(mockProjects[0].description);
        expect(res.body.id).toBe(projectId);
        expect(res.body.user).not.toHaveProperty('password');
      });
  });
  it('/projects/id (PATCH), should update project with tasks', async () => {
    return request(server)
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: mockProjects[1].name,
        tasks: [
          { ...mockTasks[2], status: TaskStatus.CLOSED, id: tasks[0].id },
        ],
      })
      .expect(200)
      .expect((res: { body: ProjectDto }) => {
        expect(res.body.name).toBe(mockProjects[1].name);
        expect(res.body.description).toBe(mockProjects[0].description);
        expect(res.body.id).toBe(projectId);
        expect(res.body.user).not.toHaveProperty('password');
        expect(res.body.tasks![0].title).toBe(mockTasks[2].title);
      });
  });
  it('/projects/id (DELETE), should delete project with tasks', async () => {
    await request(server)
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
    const taskRepo: Repository<Task> = testSetup.app.get(
      getRepositoryToken(Task),
    );
    const tasks = await taskRepo.find({
      where: { project: { id: projectId } },
    });
    expect(tasks.length).toBe(0);
  });
});

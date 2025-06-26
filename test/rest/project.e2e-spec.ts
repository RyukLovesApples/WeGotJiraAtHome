import * as request from 'supertest';
import { Http2Server } from 'http2';
import { TestSetup } from '../test.setup';
import { AppModule } from 'src/app.module';
import { createProject, registerAndLogin } from '../helpers/test-helpers';
import {
  mockTasks,
  mockProjects,
  testUser,
  unauthorizedUser,
  anotherUser,
} from '../mockVariables/mockVariables';
import { ProjectDto } from 'src/projects/dtos/project.dto';
import { TaskDto } from 'src/tasks/dtos/task.dto';
import { TaskStatus } from 'src/tasks/task-status.enum';
import { Repository } from 'typeorm';
import { Task } from 'src/tasks/task.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectUser } from 'src/project-users/project-user.entity';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { ProjectRole } from 'src/project-users/project-role.enum';

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
  it('resource guard, unauthorized user should not be able to get resources of project', async () => {
    const token = await registerAndLogin(server, unauthorizedUser);
    // '/projects' (GET) should not be blocked by resource guard
    await request(server)
      .get(`/projects`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(server)
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    // '/projects' (POST) should not be blocked by resource guard
    await request(server)
      .post(`/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send(mockProjects[1])
      .expect(201);
    await request(server)
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(mockProjects[2])
      .expect(401);
    await request(server)
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
  it('resource guard, new project user of ProjectRole ADMIN should only be able to read and update project', async () => {
    const token = await registerAndLogin(server, anotherUser);
    const { dataSource } = testSetup;
    const projectUserRepo = dataSource.getRepository(ProjectUser);
    const jwtData: JwtPayload = testSetup.app.get(JwtService).verify(token);
    const userId = jwtData.sub;
    const newProjectUserData = {
      userId,
      projectId,
      role: ProjectRole.ADMIN,
    };
    const newProjectUser = projectUserRepo.create(newProjectUserData);
    await projectUserRepo.save(newProjectUser);
    await request(server)
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(server)
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(mockProjects[2])
      .expect(200);
    await request(server)
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});

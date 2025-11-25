/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as request from 'supertest';
import { Http2Server } from 'http2';
import { TestSetup } from '../test.setup';
import { AppModule } from 'src/app.module';
import {
  createProject,
  createTask,
  registerAndLogin,
} from '../helpers/test-helpers';
import {
  dummyTasks,
  dummyProjects,
  defaultUser,
  unauthorizedUser,
  secondUser,
  dummyEpics,
} from '../dummy-variables/dummy-variables';
import { ProjectDto } from 'src/projects/dtos/project.dto';
import { TaskDto } from 'src/tasks/dtos/task.dto';
import { Repository } from 'typeorm';
import { Task } from 'src/tasks/task.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectUser } from 'src/project-users/project-user.entity';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { ProjectRole } from 'src/project-users/project-role.enum';
import { EpicDto } from 'src/epics/dtos/epic.dto';
import { Epic } from 'src/epics/epics.entity';

describe('Project Integration', () => {
  let testSetup: TestSetup;
  let server: Http2Server;
  let projectId: string;
  let accessToken: string;
  let epicId: string;
  let existingTasks: TaskDto[];

  beforeAll(async () => {
    testSetup = await TestSetup.create(AppModule);
    server = testSetup.app.getHttpServer() as Http2Server;
  });

  beforeEach(async () => {
    accessToken = await registerAndLogin(server, defaultUser);

    const project = await createProject(server, accessToken, {
      ...dummyProjects[0],
    });
    const projectBody = project.body as ProjectDto;
    projectId = projectBody.id;

    // Create a base epic for task creation
    const epicRes = await request(server)
      .post(`/projects/${projectId}/epics`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(dummyEpics[1])
      .expect(201);
    const epic = epicRes.body as EpicDto;
    epicId = epic.id;

    const baseUrl = `/projects/${projectId}/epics/${epicId}`;

    await createTask(server, accessToken, { ...dummyTasks[0] }, baseUrl);
    await createTask(server, accessToken, { ...dummyTasks[1] }, baseUrl);

    const tasks = await request(server)
      .get(`${baseUrl}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`);

    const body = tasks.body.data as TaskDto[];
    existingTasks = body;
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('/projects (POST), should create project without password exposure', async () => {
    return createProject(server, accessToken, dummyProjects[0])
      .expect(201)
      .expect((res: { body: ProjectDto }) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe(dummyProjects[0].name);
        expect(res.body.user).toBeDefined();
        expect(res.body.user).not.toHaveProperty('password');
      });
  });

  it('/projects (GET), should return all the user projects', async () => {
    await request(server)
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(dummyProjects[1])
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
      .send(dummyProjects[1])
      .expect(200)
      .expect((res: { body: ProjectDto }) => {
        expect(res.body.name).toBe(dummyProjects[1].name);
        expect(res.body.id).toBe(projectId);
        expect(res.body.user).not.toHaveProperty('password');
      });
  });

  it('/projects/id (PATCH), should only update passed properties', async () => {
    return request(server)
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: dummyProjects[1].name })
      .expect(200)
      .expect((res: { body: ProjectDto }) => {
        expect(res.body.name).toBe(dummyProjects[1].name);
        expect(res.body.description).toBe(dummyProjects[0].description);
        expect(res.body.id).toBe(projectId);
        expect(res.body.user).not.toHaveProperty('password');
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
    expect(existingTasks.length).toEqual(2);
    const tasks = await taskRepo.find({
      where: { project: { id: projectId } },
    });
    expect(tasks.length).toEqual(0);
  });

  it('/projects/id (DELETE), should delete epics with project', async () => {
    const epicRepo: Repository<Epic> = testSetup.app.get(
      getRepositoryToken(Epic),
    );

    const initialEpics = await epicRepo.find({
      where: { projectId },
    });
    expect(initialEpics.length).toEqual(1);

    await request(server)
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const epicsAfterDelete = await epicRepo.find({
      where: { projectId },
    });
    expect(epicsAfterDelete.length).toEqual(0);
  });

  it('/projects/id (DELETE), should delete project-user entries', async () => {
    const token = await registerAndLogin(server, secondUser);
    const { dataSource } = testSetup;
    const projectUserRepo = dataSource.getRepository(ProjectUser);
    const jwtData: JwtPayload = testSetup.app.get(JwtService).verify(token);
    const userId = jwtData.sub;

    const newProjectUserData = {
      userId,
      projectId,
      role: ProjectRole.USER,
    };
    await projectUserRepo.save(projectUserRepo.create(newProjectUserData));

    const initialProjectUsers = await projectUserRepo.find({
      where: { projectId },
    });
    expect(initialProjectUsers.length).toEqual(2);

    await request(server)
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const usersAfterDelete = await projectUserRepo.find({
      where: { projectId },
    });
    expect(usersAfterDelete.length).toEqual(0);
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
      .send(dummyProjects[1])
      .expect(201);
    await request(server)
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(dummyProjects[2])
      .expect(401);
    await request(server)
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('resource guard, new project user of ProjectRole ADMIN should only be able to read and update project', async () => {
    const token = await registerAndLogin(server, secondUser);
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
      .send(dummyProjects[2])
      .expect(200);
    await request(server)
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('resource guard, new project user of ProjectRole USER should only be able to read project details', async () => {
    const token = await registerAndLogin(server, secondUser);
    const { dataSource } = testSetup;
    const projectUserRepo = dataSource.getRepository(ProjectUser);
    const jwtData: JwtPayload = testSetup.app.get(JwtService).verify(token);
    const userId = jwtData.sub;

    // Add the second user as a member with the restrictive USER role
    const newProjectUserData = {
      userId,
      projectId,
      role: ProjectRole.USER,
    };
    await projectUserRepo.save(projectUserRepo.create(newProjectUserData));

    // Should be able to read
    await request(server)
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Should be blocked from modification (PATCH)
    await request(server)
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Attempted Change' })
      .expect(403);

    // Should be blocked from deletion (DELETE)
    await request(server)
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});

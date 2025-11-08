import { AppModule } from 'src/app.module';
import { TestSetup } from '../test.setup';
import * as request from 'supertest';
import { Http2Server } from 'http2';
import {
  defaultUser,
  dummyProjects,
  dummyEpics,
  unauthorizedUser,
  dummyTasks,
  secondUser,
} from '../dummy-variables/dummy-variables';
import {
  registerAndLogin,
  createProject,
  createEpic,
  createTask,
} from '../helpers/test-helpers';
import { ProjectDto } from 'src/projects/dtos/project.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { EpicDto } from 'src/epics/dtos/epic.dto';
import { HttpErrorResponse } from 'test/types/test.types';
import { randomUUID } from 'crypto';
import { EpicPriority } from 'src/epics/enums/epic-priority.enum';
import { EpicStatus } from 'src/epics/enums/epic-status.enum';
import { TaskDto } from 'src/tasks/dtos/task.dto';
import { ProjectUser } from 'src/project-users/project-user.entity';
import { ProjectRole } from 'src/project-users/project-role.enum';

describe('Epics Integration', () => {
  let testSetup: TestSetup;
  let accessToken: string;
  let server: Http2Server;
  let baseUrl: string;
  let projectId: string;

  beforeAll(async () => {
    testSetup = await TestSetup.create(AppModule);
    server = testSetup.app.getHttpServer() as Http2Server;
  });

  beforeEach(async () => {
    const token = await registerAndLogin(server, { ...defaultUser });
    const project = await createProject(server, token, {
      ...dummyProjects[0],
    });
    const projectBody = project.body as ProjectDto;
    projectId = projectBody.id;

    baseUrl = `/projects/${projectBody.id}`;
    accessToken = token;
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('/epics (POST), should create an epic', async () => {
    const res = await request(server)
      .post(`${baseUrl}/epics`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...dummyEpics[0] })
      .expect(201);
    const body = res.body as EpicDto;
    expect(body.name).toBe(dummyEpics[0].name);
    expect(body.priority).toBe(dummyEpics[0].priority);
  });

  it('/epics (POST), should throw Bad Request (400), test global validation pipe', async () => {
    const epicWithoutName = {
      priority: EpicPriority.HIGH,
    };
    const res = await request(server)
      .post(`${baseUrl}/epics`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(epicWithoutName)
      .expect(400);
    const body = res.body as HttpErrorResponse;
    expect(body.message).toContain(
      'name must be a string, name should not be empty',
    );
  });

  it('/epics (POST), should set default values Epic', async () => {
    const epicData = await createEpic(
      server,
      accessToken,
      { name: 'test name' },
      baseUrl,
    );
    const epic = epicData.body as EpicDto;
    expect(epic.priority).toBe(EpicPriority.MEDIUM);
    expect(epic.status).toBe(EpicStatus.TODO);
    expect(epic.archived).toBe(false);
  });

  it('/epics (POST), permission guard should block post of unknown project user, 401 Unauthorized', async () => {
    const token = await registerAndLogin(server, unauthorizedUser);
    const epicData = await createEpic(server, token, dummyEpics[1], baseUrl);
    const body = epicData.body as HttpErrorResponse;
    expect(body.statusCode).toBe(401);
    expect(body.message).toContain('User is not part of project.');
  });

  it('/epics/epicId (GET),should get one epic', async () => {
    const epicData = await createEpic(
      server,
      accessToken,
      dummyEpics[1],
      baseUrl,
    );

    const epic = epicData.body as EpicDto;

    const res = await request(server)
      .get(`${baseUrl}/epics/${epic.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as EpicDto;

    expect(body.name).toContain(dummyEpics[1].name);
    expect(body.priority).toBe(dummyEpics[1].priority);
  });

  it('/epics/epicId (GET), should throw Not Found (404), accessing epic with wrong projectId', async () => {
    const projectData = await createProject(
      server,
      accessToken,
      dummyProjects[1],
    );
    const project = projectData.body as ProjectDto;
    const projectId = project.id;

    const epicData = await createEpic(
      server,
      accessToken,
      dummyEpics[0],
      baseUrl,
    );
    const epic = epicData.body as EpicDto;
    const epicId = epic.id;

    await request(server)
      .get(`/projects/${projectId}/epics/${epicId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('/epics/epicId (GET), should throw Not Fround (404), epic not found', async () => {
    const wrongEpicId = randomUUID();
    const res = await request(server)
      .get(`${baseUrl}/epics/${wrongEpicId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
    const body = res.body as HttpErrorResponse;
    expect(body.message).toContain(`Epic with id ${wrongEpicId} not found.`);
  });

  it('/epics (GET), should return all epics', async () => {
    await createEpic(server, accessToken, dummyEpics[0], baseUrl);
    await createEpic(server, accessToken, dummyEpics[1], baseUrl);

    const res = await request(server)
      .get(`${baseUrl}/epics`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as EpicDto[];

    expect(body.length).toEqual(2);
    expect(body[0].name).toBe(dummyEpics[0].name);
    expect(body[1].description).toBe(dummyEpics[1].description);
    expect(body[1].status).toBe(dummyEpics[1].status);
  });

  it('/epics/epicId (PATCH), should update ownerId and description', async () => {
    const epicData = await createEpic(
      server,
      accessToken,
      dummyEpics[0],
      baseUrl,
    );

    const epic = epicData.body as EpicDto;

    expect(epic.ownerId).toBeNull();
    expect(epic.description).toBeNull();

    const epicId = epic.id;

    const jwtData: JwtPayload = testSetup.app
      .get(JwtService)
      .verify(accessToken);

    const ownerId = jwtData.sub;
    const description = 'this is a test description';

    const res = await request(server)
      .patch(`${baseUrl}/epics/${epicId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ description, ownerId })
      .expect(200);

    const resBody = res.body as EpicDto;

    expect(resBody.name).toBe(dummyEpics[0].name);
    expect(resBody.ownerId).toBe(ownerId);
    expect(resBody.description).toBe(description);
  });

  it('/epics/epicId (PATCH), should throw Bad Request (400), change on archived epic', async () => {
    const epicData = await createEpic(
      server,
      accessToken,
      { ...dummyEpics[1], archived: true },
      baseUrl,
    );
    const epic = epicData.body as EpicDto;
    const epicId = epic.id;

    expect(epic.archived).toBe(true);

    const newName = { name: 'changed epic name' };

    const res = await request(server)
      .patch(`${baseUrl}/epics/${epicId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(newName);
    const body = res.body as HttpErrorResponse;
    expect(body.statusCode).toBe(400);
    expect(body.message).toContain('Cannot modify an archived epic.');
  });

  it('/epics/epicId (PATCH), should be able to change archived from false to true', async () => {
    const epicData = await createEpic(
      server,
      accessToken,
      { ...dummyEpics[0], archived: true },
      baseUrl,
    );
    const epic = epicData.body as EpicDto;

    const newName = { name: 'changed epic name' };

    await request(server)
      .patch(`${baseUrl}/epics/${epic.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(newName)
      .expect(400);

    await request(server)
      .patch(`${baseUrl}/epics/${epic.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ archived: false })
      .expect(200);

    const res = await request(server)
      .patch(`${baseUrl}/epics/${epic.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(newName)
      .expect(200);
    const body = res.body as EpicDto;
    expect(body.name).toBe(newName.name);
  });

  it('/epics/epicId (DELETE), should delete epic', async () => {
    const epicData = await createEpic(
      server,
      accessToken,
      { ...dummyEpics[0] },
      baseUrl,
    );

    const epic = epicData.body as EpicDto;

    expect(epic.id).toBeDefined();

    await request(server)
      .delete(`${baseUrl}/epics/${epic.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(server)
      .get(`${baseUrl}/epics/${epic.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('/epics/epicId (DELETE), should delete tasks with epic', async () => {
    const epicData = await createEpic(
      server,
      accessToken,
      dummyEpics[1],
      baseUrl,
    );
    const epic = epicData.body as EpicDto;
    const epicId = epic.id;

    const res = await createTask(
      server,
      accessToken,
      dummyTasks[2],
      `${baseUrl}/epics/${epicId}`,
    );

    const taskBody = res.body as TaskDto;

    const taskData = await request(server)
      .get(`${baseUrl}/epics/${epicId}/tasks/${taskBody.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const task = taskData.body as TaskDto;
    expect(task.epicId).toBe(epicId);

    await request(server)
      .delete(`${baseUrl}/epics/${epicId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(server)
      .get(`${baseUrl}/epics/${epicId}/tasks/${taskBody.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('/epics/epicId (DELETE), should not be able to delete archived epic', async () => {
    const epicData = await createEpic(
      server,
      accessToken,
      { ...dummyEpics[0], archived: true },
      baseUrl,
    );
    const epic = epicData.body as EpicDto;

    const res = await request(server)
      .delete(`${baseUrl}/epics/${epic.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
    const body = res.body as HttpErrorResponse;
    expect(body.message).toContain('Cannot delete an archived epic.');
  });

  it('resource guard, new project user of ProjectRole USER should only be able to read from epics routes', async () => {
    const epicData = await createEpic(
      server,
      accessToken,
      dummyEpics[1],
      baseUrl,
    );
    const epic = epicData.body as EpicDto;
    const epicId = epic.id;

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
    const newProjectUser = projectUserRepo.create(newProjectUserData);
    await projectUserRepo.save(newProjectUser);

    await request(server)
      .get(`${baseUrl}/epics/${epicId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(server)
      .get(`${baseUrl}/epics`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(server)
      .post(`${baseUrl}/epics`)
      .set('Authorization', `Bearer ${token}`)
      .send(dummyEpics[2])
      .expect(403);
    await request(server)
      .patch(`${baseUrl}/epics/${epicId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(dummyEpics[1])
      .expect(403);
    await request(server)
      .delete(`${baseUrl}/epics/${epicId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});

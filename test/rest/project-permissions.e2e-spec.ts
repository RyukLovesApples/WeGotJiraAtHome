import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestSetup } from '../test.setup';
import { Http2Server } from 'http2';
import { createProject, registerAndLogin } from '../helpers/test-helpers';
import {
  anotherUser,
  mockProjects,
  mockTasks,
  testUser,
} from '../mockVariables/mockVariables';
import { ProjectDto } from 'src/projects/dtos/project.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { ProjectRole } from 'src/project-users/project-role.enum';
import { ProjectUser } from 'src/project-users/project-user.entity';
import { CreateProjectPermissionDto } from 'src/project-permissions/dtos/create-project-permission.dto';
import { Resource } from 'src/project-permissions/enums/resource.enum';

describe('Permissions Integration', () => {
  let testSetup: TestSetup;
  let server: Http2Server;
  let accessToken: string;
  let projectId: string;
  let anotherUserAccessToken: string;
  let baseUrl: string;

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);
    server = testSetup.app.getHttpServer() as Http2Server;
    const token = await registerAndLogin(server, testUser);
    accessToken = token;
    const project = await createProject(server, token, mockProjects[0]);
    const projectBody = project.body as ProjectDto;
    projectId = projectBody.id;
    anotherUserAccessToken = await registerAndLogin(server, anotherUser);
    baseUrl = `/projects/${projectBody.id}`;
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('owner should be able to create custom permissions for user role to create task and cache new permissions', async () => {
    const permissionChange: CreateProjectPermissionDto = {
      role: ProjectRole.USER,
      permissions: {
        [Resource.TASK]: {
          create: true,
          read: true,
        },
      },
    };
    // Create project user for the project with another user
    const { dataSource } = testSetup;
    const projectUserRepo = dataSource.getRepository(ProjectUser);
    const jwtData: JwtPayload = testSetup.app
      .get(JwtService)
      .verify(anotherUserAccessToken);
    const userId = jwtData.sub;
    const newProjectUserData = {
      userId,
      projectId,
      role: ProjectRole.USER,
    };
    const newProjectUser = projectUserRepo.create(newProjectUserData);
    await projectUserRepo.save(newProjectUser);

    // Try creating task -> should fail with 403 Forbidden
    await request(server)
      .post(`${baseUrl}/tasks`)
      .set('Authorization', `Bearer ${anotherUserAccessToken}`)
      .send(mockTasks[0])
      .expect(403);
    // User should be able to read project as project user
    await request(server)
      .get(`${baseUrl}`)
      .set('Authorization', `Bearer ${anotherUserAccessToken}`)
      .expect(200);
    // Owner changes permissions, so user can create tasks
    await request(server)
      .post(`${baseUrl}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([permissionChange])
      .expect(201);
    // User should no longer be able to create a task
    await request(server)
      .post(`${baseUrl}/tasks`)
      .set('Authorization', `Bearer ${anotherUserAccessToken}`)
      .send(mockTasks[0])
      .expect(201);
    // Since only the tasks resource was passed, this means all other resources are no longer accessible.
    // Project read permission should no longer be available -> 403 Forbidden
    await request(server)
      .get(`${baseUrl}`)
      .set('Authorization', `Bearer ${anotherUserAccessToken}`)
      .expect(403);
    // Since custom permissions are only accessible via cache -> caching strategy works as expected
    // No extra test needed here.
  });
});

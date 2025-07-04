import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestSetup } from '../test.setup';
import { Http2Server } from 'http2';
import { createProject, registerAndLogin } from '../helpers/test-helpers';
import {
  secondUser,
  dummyProjects,
  dummyTasks,
  defaultUser,
  thirdUser,
  unauthorizedUser,
} from '../dummy-variables/dummy-variables';
import { ProjectDto } from 'src/projects/dtos/project.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { ProjectRole } from 'src/project-users/project-role.enum';
import { ProjectUser } from 'src/project-users/project-user.entity';
import { CreateProjectPermissionDto } from 'src/project-permissions/dtos/create-project-permission.dto';
import { Resource } from 'src/project-permissions/enums/resource.enum';

describe('Project permissions Integration', () => {
  let testSetup: TestSetup;
  let server: Http2Server;
  let accessToken: string;
  let projectId: string;
  let secondUserAccessToken: string;
  let baseUrl: string;

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);
    server = testSetup.app.getHttpServer() as Http2Server;
    const token = await registerAndLogin(server, defaultUser);
    accessToken = token;
    const project = await createProject(server, token, dummyProjects[0]);
    const projectBody = project.body as ProjectDto;
    projectId = projectBody.id;
    secondUserAccessToken = await registerAndLogin(server, secondUser);
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
      .verify(secondUserAccessToken);
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
      .set('Authorization', `Bearer ${secondUserAccessToken}`)
      .send(dummyTasks[0])
      .expect(403);
    // User should be able to read project as project user
    await request(server)
      .get(`${baseUrl}`)
      .set('Authorization', `Bearer ${secondUserAccessToken}`)
      .expect(200);
    // Owner changes permissions, so user can create tasks
    await request(server)
      .post(`${baseUrl}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([permissionChange])
      .expect(201);
    // User should now be able to create a task
    await request(server)
      .post(`${baseUrl}/tasks`)
      .set('Authorization', `Bearer ${secondUserAccessToken}`)
      .send(dummyTasks[0])
      .expect(201);
    // Since only the tasks resource was passed, this means all other resources are no longer accessible.
    // Project read permission should no longer be available -> 403 Forbidden
    await request(server)
      .get(`${baseUrl}`)
      .set('Authorization', `Bearer ${secondUserAccessToken}`)
      .expect(403);
    // Since custom permissions are only accessible via cache -> caching strategy works as expected
    // No extra test needed here.
  });
  it('no project user should be able to change owner resource permissions, forbidden', async () => {
    const permissionChange: CreateProjectPermissionDto = {
      role: ProjectRole.OWNER,
      permissions: {
        [Resource.TASK]: {
          create: true,
          read: true,
        },
      },
    };
    await request(server)
      .post(`${baseUrl}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([permissionChange])
      .expect(403);
  });
  it('owner should be able to change multiple role permissions', async () => {
    const permissionChange: CreateProjectPermissionDto[] = [
      {
        role: ProjectRole.USER,
        permissions: {
          [Resource.TASK]: {
            create: true,
            read: true,
          },
          [Resource.PROJECT]: {
            update: true,
          },
        },
      },
      {
        role: ProjectRole.ADMIN,
        permissions: {
          [Resource.TASK]: {
            read: true,
          },
        },
      },
    ];
    const { dataSource } = testSetup;
    const projectUserRepo = dataSource.getRepository(ProjectUser);

    // Register second user as project user -> Role USER
    const jwtDataSecondUser: JwtPayload = testSetup.app
      .get(JwtService)
      .verify(secondUserAccessToken);
    const secondUserId = jwtDataSecondUser.sub;
    const secondProjectUserData = {
      userId: secondUserId,
      projectId,
      role: ProjectRole.USER,
    };
    const secondProjectUser = projectUserRepo.create(secondProjectUserData);
    await projectUserRepo.save(secondProjectUser);

    // Register third user as project user -> Role ADMIN
    const thirdUserToken = await registerAndLogin(server, thirdUser);
    const jwtDataThirdUser: JwtPayload = testSetup.app
      .get(JwtService)
      .verify(thirdUserToken);
    const thirdUserId = jwtDataThirdUser.sub;
    console.log(thirdUserId);
    const thirdProjectUserData = {
      userId: thirdUserId,
      projectId,
      role: ProjectRole.ADMIN,
    };
    const thirdProjectUser = projectUserRepo.create(thirdProjectUserData);
    await projectUserRepo.save(thirdProjectUser);
    console.log('hey');

    // Project user of role USER should by default not be able to update projects -> 403 Forbidden
    await request(server)
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${secondUserAccessToken}`)
      .send(dummyProjects[1])
      .expect(403);

    // Project user of role ADMIN should by default be able to create a task
    await request(server)
      .post(`${baseUrl}/tasks`)
      .set('Authorization', `Bearer ${thirdUserToken}`)
      .send({ ...dummyTasks[0] })
      .expect(201);

    // Owner should be able to change the permissions of USER and ADMIN simultaneously
    await request(server)
      .post(`${baseUrl}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(permissionChange)
      .expect(201);

    // USER role should now be able to update the project
    await request(server)
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${secondUserAccessToken}`)
      .send({ ...dummyProjects[1] })
      .expect(200);

    // ADMIN role should no longer be able to create a task
    await request(server)
      .post(`${baseUrl}/tasks`)
      .set('Authorization', `Bearer ${thirdUserToken}`)
      .send({ ...dummyTasks[1] })
      .expect(403);
  });
  it('should not allow to pass unknown project role, test validation', async () => {
    const permissionChange = {
      role: 'super-user',
      permissions: {
        [Resource.TASK]: {
          create: true,
          read: true,
        },
      },
    };
    await request(server)
      .post(`${baseUrl}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([permissionChange])
      .expect(400);
  });
  it('should throw conflict if unauthorized user tries to access project route', async () => {
    const unauthorizedToken = await registerAndLogin(server, unauthorizedUser);
    await request(server)
      .get(`${baseUrl}/permissions`)
      .set('Authorization', `Bearer ${unauthorizedToken}`)
      .expect(401);
  });
});

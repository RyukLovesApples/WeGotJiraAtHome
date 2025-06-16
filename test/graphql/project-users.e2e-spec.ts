import * as request from 'supertest';
import { Http2Server } from 'http2';
import { TestSetup } from '../test.setup';
import { AppModule } from 'src/app.module';
import {
  registerAndLogin,
  createProject,
  createProjectUser,
  logErrorAndFail,
} from '../helpers/test-helpers';
import { CreateProjectUserInput } from 'src/project-users/dtos/create-project-user.dto';
import { ProjectRole } from 'src/project-users/project-role.enum';
import { ProjectDto } from 'src/projects/dtos/project.dto';
import {
  anotherUser,
  mockProjects,
  mockTasks,
  testUser,
  unauthorizedUser,
} from '../mockVariables/mockVariables';
import { ProjectUserDto } from 'src/project-users/dtos/project-user.dto';
import { UpdateProjectUserRoleInput } from 'src/project-users/dtos/update-project-user.input';
import { GraphQLResponse } from '../types/test.types';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';

describe('ProjectUser Integration (GraphQL)', () => {
  let testSetup: TestSetup;
  let server: Http2Server;
  let accessToken: string;
  let projectId: string;
  let projectOwnerId: string;
  let anotherUserId: string;

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
    projectOwnerId = projectBody.user.id;
    const anotherUserToken = await registerAndLogin(server, anotherUser);
    const anotherUserJwtData: JwtPayload = testSetup.app
      .get(JwtService)
      .verify(anotherUserToken);
    if (!anotherUserJwtData.sub) {
      throw new Error('Could not find userId of another user');
    }
    anotherUserId = anotherUserJwtData.sub;
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('should create a project user', async () => {
    const mutation = `
      mutation CreateProjectUser($input: CreateProjectUserInput!) {
        createProjectUser(input: $input) {
          id
          userId
          projectId
          role
        }
      }`;

    const variables = {
      input: {
        userId: anotherUserId,
        projectId,
        role: ProjectRole.USER,
      } satisfies CreateProjectUserInput,
    };

    const response: GraphQLResponse<{ createProjectUser: ProjectUserDto }> =
      await request(server)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: mutation,
          variables,
        })
        .expect(200);
    logErrorAndFail(response);
    expect(response.body.data!.createProjectUser).toHaveProperty('id');
    expect(response.body.data!.createProjectUser.userId).toBe(
      variables.input.userId,
    );
    expect(response.body.data!.createProjectUser.projectId).toBe(projectId);
    expect(response.body.data!.createProjectUser.role).toBe(ProjectRole.USER);
  });
  it('should throw conflict creating identical project user', async () => {
    const variables = {
      input: {
        userId: projectOwnerId,
        projectId,
        role: ProjectRole.USER,
      } satisfies CreateProjectUserInput,
    };
    await createProjectUser(server, variables, accessToken);
    const response: GraphQLResponse<{
      createProjectUser: CreateProjectUserInput;
    }> = await createProjectUser(server, variables, accessToken);
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors![0].extensions!.status).toBe(409);
    expect(response.body.errors![0].message).toContain(
      'User is already part of this project',
    );
  });
  it('should update a project user role', async () => {
    const variables = {
      input: {
        userId: anotherUserId,
        projectId,
        role: ProjectRole.USER,
      } satisfies CreateProjectUserInput,
    };
    const createResponse = await createProjectUser(
      server,
      variables,
      accessToken,
    );
    const updateMutation = `
    mutation UpdateProjectUser($input: UpdateProjectUserRoleInput!) {
      updateProjectUser(input: $input) {
        id
        userId
        projectId
        role
      }
    }`;
    const updateVariables = {
      input: {
        userId: anotherUserId,
        projectId,
        role: ProjectRole.ADMIN,
      } satisfies UpdateProjectUserRoleInput,
    };
    const updateResponse: GraphQLResponse<{
      updateProjectUser: ProjectUserDto;
    }> = await request(server)
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: updateMutation,
        variables: updateVariables,
      })
      .expect(200);
    logErrorAndFail(updateResponse);
    expect(updateResponse.body.data!.updateProjectUser.id).toBe(
      createResponse.body.data!.createProjectUser.id,
    );
    expect(updateResponse.body.data!.updateProjectUser.role).toBe(
      updateVariables.input.role,
    );
  });
  it('should delete a project user', async () => {
    const variables = {
      input: {
        userId: anotherUserId,
        projectId,
        role: ProjectRole.USER,
      } satisfies CreateProjectUserInput,
    };
    await createProjectUser(server, variables, accessToken);
    const deleteMutation = `
      mutation DeleteProjectUser($userId: String!, $projectId: String!) {
        deleteProjectUser(userId: $userId, projectId: $projectId)
        }`;
    const deleteVaraibles = {
      userId: anotherUserId,
      projectId,
    };
    const response: GraphQLResponse<{ deleteProjectUser: boolean }> =
      await request(server)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: deleteMutation,
          variables: deleteVaraibles,
        })
        .expect(200);
    logErrorAndFail(response);
    expect(response.body.data!.deleteProjectUser).toBe(true);
  });
  it('should get one project user', async () => {
    const createVariables = {
      input: {
        userId: anotherUserId,
        projectId,
        role: ProjectRole.ADMIN,
      } satisfies CreateProjectUserInput,
    };
    await createProjectUser(server, createVariables, accessToken);
    const query = `
    query GetOneProjectUser($userId: String!, $projectId: String!) {
      getOneProjectUser(userId: $userId, projectId: $projectId){
      id
      userId
      user {
        username
        email
      }
      projectId
      role
      }
    }`;
    const variables = { userId: anotherUserId, projectId };
    const response: GraphQLResponse<{ getOneProjectUser: ProjectUserDto }> =
      await request(server)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query,
          variables,
        })
        .expect(200);
    logErrorAndFail(response);
    expect(response.body.data?.getOneProjectUser.role).toBe(ProjectRole.ADMIN);
    expect(response.body.data?.getOneProjectUser.user?.username).toBe(
      anotherUser.username,
    );
    expect(response.body.data?.getOneProjectUser.user?.email).toBe(
      anotherUser.email,
    );
  });
  it('should return all project users', async () => {
    const firstUserVariables = {
      input: {
        userId: anotherUserId,
        projectId,
        role: ProjectRole.USER,
      } satisfies CreateProjectUserInput,
    };
    const newUserToken = await registerAndLogin(server, unauthorizedUser);
    const jwtData: JwtPayload = testSetup.app
      .get(JwtService)
      .verify(newUserToken);
    console.log(jwtData);
    const secondUserVariables = {
      input: {
        userId: jwtData.sub!,
        projectId,
        role: ProjectRole.ADMIN,
      } satisfies CreateProjectUserInput,
    };
    await createProjectUser(server, firstUserVariables, accessToken);
    await createProjectUser(server, secondUserVariables, newUserToken);
    const query = `
    query GetAllProjectUsers($projectId: String!) {
      getAllProjectUsers(projectId: $projectId) {
        id
        userId
        user {
          username
          email
        }
        projectId
        role
      }
    }
  `;
    const response: GraphQLResponse<{ getAllProjectUsers: ProjectUserDto[] }> =
      await request(server)
        .post('/graphql')
        .send({ query, variables: { projectId } })
        .expect(200);
    logErrorAndFail(response);
    expect(response.body.data!.getAllProjectUsers.length).toBe(3);
  });
});

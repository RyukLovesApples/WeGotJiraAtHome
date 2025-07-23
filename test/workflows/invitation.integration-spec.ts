import * as request from 'supertest';
import { Http2Server } from 'http2';
import { AppModule } from '../../src/app.module';
import { TestSetup } from '../test.setup';
import { createProject, registerAndLogin } from '../helpers/test-helpers';
import {
  dummyProjects,
  defaultUser,
  invitedUser,
} from '../dummy-variables/dummy-variables';
import { ProjectDto } from 'src/projects/dtos/project.dto';
import { ProjectUserInvite } from 'src/invite/project-user-invite.entity';
import { ProjectRole } from 'src/project-users/project-role.enum';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { GraphQLResponse } from 'test/types/test.types';
import { ProjectUserDto } from 'src/project-users/dtos/project-user.dto';

describe('Project invitation workflow', () => {
  let testSetup: TestSetup;
  let server: Http2Server;

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);
    server = testSetup.app.getHttpServer() as Http2Server;
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  /*
    1. Register and login as initial user
    2. Create a project
    3. Create invitation and send mail with token
    4. Register and login as invited user, send token back
    5. Create project user from invitation
    6. New project user fetches all tasks
  */

  it('should go through invitation cycle', async () => {
    // Register & login as initial user
    const user1AccessToken = await registerAndLogin(server, defaultUser);

    // Create a project
    const project = await createProject(
      server,
      user1AccessToken,
      dummyProjects[0],
    );
    const projectBody = project.body as ProjectDto;

    // Create invitation
    const inviteEmail = invitedUser.email;
    const invitePayload = {
      email: invitedUser.email,
      role: ProjectRole.ADMIN,
      projectId: projectBody.id,
    };
    await request(server)
      .post(`/projects/${projectBody.id}/invite`)
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .send(invitePayload)
      .expect(201);

    // Simulate retrieval of the token from the database
    const { dataSource } = testSetup;
    const invite = (await dataSource
      .getRepository(ProjectUserInvite)
      .findOneBy({ email: inviteEmail })) as ProjectUserInvite;
    const token = invite?.token;
    expect(token).toBeDefined();

    // Register and login as invited user
    const invitedUserToken = await registerAndLogin(server, invitedUser);

    // Accept invitation (GraphQL)
    const mutation = `
    mutation AcceptProjectInvite($token: String!) {
      acceptProjectInvite(token: $token)
    }
  `;
    const res: GraphQLResponse<{ acceptProjectInvite: boolean }> =
      await request(server)
        .post('/graphql')
        .set('Authorization', `Bearer ${invitedUserToken}`)
        .send({
          query: mutation,
          variables: { token },
        });
    expect(res.body.data?.acceptProjectInvite).toBe(true);

    // Verify invited user is now a project user by fetching data
    const query = `
    query GetOneProjectUser($userId: String!, $projectId: String!) {
      getOneProjectUser(userId: $userId, projectId: $projectId) {
        userId
        projectId
        role
      }
    }
  `;
    const JwtData: JwtPayload = testSetup.app
      .get(JwtService)
      .verify(invitedUserToken);
    const invitedUserId = JwtData.sub;
    const verifyRes: GraphQLResponse<{ getOneProjectUser: ProjectUserDto }> =
      await request(server)
        .post('/graphql')
        .set('Authorization', `Bearer ${invitedUserToken}`)
        .send({
          query,
          variables: { userId: invitedUserId, projectId: projectBody.id },
        });
    expect(verifyRes.body.data?.getOneProjectUser.userId).toBe(invitedUserId);
    expect(verifyRes.body.data?.getOneProjectUser.projectId).toBe(
      projectBody.id,
    );
  });
});

import * as request from 'supertest';
import { Http2Server } from 'http2';
import { AppModule } from '../../src/app.module';
import { TestSetup } from '../test.setup';
import { createProject, registerAndLogin } from '../helpers/test-helpers';
import {
  mockProjects,
  testUser,
  invitedUser,
} from '../mockVariables/mockVariables';
import { ProjectDto } from 'src/projects/dtos/project.dto';
import { ProjectUserInvite } from 'src/invite/project-user-invite.entity';
import { ProjectRole } from 'src/project-users/project-role.enum';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { MailerService } from 'src/mailer/mailer.service';
import { SendMailOptions } from 'src/mailer/types/send-mail-options.type';
import { GraphQLResponse } from 'test/types/test.types';
import { ProjectUserDto } from 'src/project-users/dtos/project-user.dto';

describe('Project invitation workflow', () => {
  let testSetup: TestSetup;
  let server: Http2Server;
  let mailerServiceMock: jest.SpyInstance<
    Promise<any>,
    [mailData: SendMailOptions]
  >;

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);
    server = testSetup.app.getHttpServer() as Http2Server;

    const mailerService = testSetup.app.get(MailerService);
    mailerServiceMock = jest
      .spyOn(mailerService, 'sendEmail')
      .mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    mailerServiceMock.mockRestore();
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
    const user1AccessToken = await registerAndLogin(server, testUser);

    // Create a project
    const project = await createProject(
      server,
      user1AccessToken,
      mockProjects[0],
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
      .post('/invite')
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

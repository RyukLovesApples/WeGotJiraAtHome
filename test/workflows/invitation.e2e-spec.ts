// import * as request from 'supertest';
// import { Http2Server } from 'http2';
// import { AppModule } from '../../src/app.module';
// import { TestSetup } from '../test.setup';
// import { createProject, registerAndLogin } from 'test/helpers/test-helpers';
// import { mockProjects, testUser } from 'test/mockVariables/mockVariables';

// describe('Project invitaion Integration', () => {
//   let testSetup: TestSetup;
//   let server: Http2Server;

//   beforeEach(async () => {
//     testSetup = await TestSetup.create(AppModule);
//     server = testSetup.app.getHttpServer() as Http2Server;
//   });

//   afterEach(async () => {
//     await testSetup.cleanup();
//   });

//   afterAll(async () => {
//     await testSetup.teardown();
//   });
/*
    1. Register and login as initial user
    2. Create a project
    3. Create invitation and send mail with token
    4. Register and login as invited user, send token back
    5. Create project user from invitation
    6. New project user fetches all tasks
  */
// it('should go through invitaion cycle', async () => {
//   const query = `
//   mutation AcceptInvitation($token: String!) {
//     acceptInvitation(token: $token)
//   }`;
//   const user1AccessToken = await registerAndLogin(server, testUser);
//   const project = await createProject(
//     server,
//     user1AccessToken,
//     mockProjects[0],
//   );
//   const mail = await request(server)
//     .post('/invite')
//     .set('Authorization', `Bearer ${accessToken}`)
//     .send()
// });
// });

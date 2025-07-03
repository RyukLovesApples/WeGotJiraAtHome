import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestSetup } from '../test.setup';
import { Http2Server } from 'http2';
import { createProject, registerAndLogin } from 'test/helpers/test-helpers';
import { mockProjects, testUser } from 'test/mockVariables/mockVariables';
import { ProjectDto } from 'src/projects/dtos/project.dto';

describe('Auth Integration', () => {
  let testSetup: TestSetup;
  let server: Http2Server;
  let accessToken: string;
  let projectId: string;

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);
    server = testSetup.app.getHttpServer() as Http2Server;
    const token = await registerAndLogin(server, testUser);
    accessToken = token;
    const project = await createProject(server, token, mockProjects[0]);
    const projectBody = project.body as ProjectDto;
    projectId = projectBody.id;
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('owner should be able to create custom permissions for user role to create task and cache new permissions', async () => {});
});

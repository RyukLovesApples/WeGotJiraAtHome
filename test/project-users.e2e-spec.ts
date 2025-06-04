import * as request from 'supertest';
import { Http2Server } from 'http2';
import { TestSetup } from './test.setup';
import { AppModule } from 'src/app.module';
import { registerAndLogin, createProject } from './helpers/test-helpers';
import { CreateProjectUserInput } from 'src/project-users/dtos/create-project-user.dto';
import { ProjectRole } from 'src/project-users/project-role.enum';
import { ProjectDto } from 'src/projects/dtos/project.dto';
import {
  mockProjects,
  mockTasks,
  testUser,
} from './mockVariables/mockVariables';
import { ProjectUserDto } from 'src/project-users/dtos/project-user.dto';

describe('ProjectUser Integration (GraphQL)', () => {
  let testSetup: TestSetup;
  let server: Http2Server;
  let accessToken: string;
  let projectId: string;
  let userId: string;

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
    userId = projectBody.user.id;
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  type GraphQLResponse<T> = { body: { data: T } };

  it('should create a project user', async () => {
    const mutation = `
      mutation CreateProjectUser($input: CreateProjectUserInput!) {
        create(input: $input) {
          id
          userId
          projectId
          role
        }
      }
    `;

    const variables = {
      input: {
        userId,
        projectId,
        role: ProjectRole.USER,
      } satisfies CreateProjectUserInput,
    };

    const response: GraphQLResponse<{ create: ProjectUserDto }> = await request(
      server,
    )
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: mutation,
        variables,
      })
      .expect(200);
    expect(response.body.data.create).toHaveProperty('id');
    expect(response.body.data.create.userId).toBe(variables.input.userId);
    expect(response.body.data.create.projectId).toBe(projectId);
    expect(response.body.data.create.role).toBe(ProjectRole.USER);
  });
});

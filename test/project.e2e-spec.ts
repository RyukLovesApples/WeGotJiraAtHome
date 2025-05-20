import * as request from 'supertest';
import { Http2Server } from 'http2';
import { TestSetup } from './test.setup';
import { AppModule } from 'src/app.module';
import { registerAndLogin } from './helpers/test-helpers';
import { mockTasks, testUser } from './mockVariables/mockVariables';
import { Project } from 'src/projects/project.entity';

describe('Project Integration', () => {
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

  it('test project route connection /projects (POST)', async () => {
    const token = await registerAndLogin(server, testUser);
    return request(server)
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'test', description: 'test description' })
      .expect(201)
      .expect((res: { body: Project }) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe('test');
        expect(res.body.user).toBeDefined();
      });
  });
  it('test project route connection /projects (POST)', async () => {
    const token = await registerAndLogin(server, testUser);
    return request(server)
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'test', description: 'test description', tasks: mockTasks })
      .expect(201)
      .expect((res: { body: Project }) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe('test');
        expect(res.body.user).toBeDefined();
        expect(res.body.tasks?.length).toBe(4);
      });
  });
});

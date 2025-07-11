import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestSetup } from '../test.setup';
import { Server } from 'http';

describe('AppController', () => {
  let testSetup: TestSetup;

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('/ (GET)', () => {
    return request(testSetup.app.getHttpServer() as Server)
      .get('/')
      .expect(200)
      .expect((res) => expect(res.text).toContain('Hello World'));
  });
});

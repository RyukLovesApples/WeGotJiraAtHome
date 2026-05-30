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

  it('/ (GET), Throttlerguard should block 21th resquest', async () => {
    const responses = [];
    for (let i = 0; i < 101; i++) {
      responses.push(
        await request(testSetup.app.getHttpServer() as Server).get('/'),
      );
    }
    expect(responses[99].statusCode).toBe(200);
    expect(responses[100].statusCode).toBe(429);
  });
});

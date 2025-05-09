import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { TestSetup } from './test.setup';

describe('AppController (e2e)', () => {
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

  interface RegisterResponse {
    username: string;
    email: string;
  }

  const testUser = {
    username: 'adonis',
    email: 'adonis@test.com',
    password: 'Password123%',
  };

  it('/users/register (POST), successfully registered, no password exposure', () => {
    return request(testSetup.app.getHttpServer())
      .post('/users/register')
      .send(testUser)
      .expect(201)
      .expect((res: { body: RegisterResponse }) => {
        expect(res.body.username).toBe(testUser.username);
        expect(res.body.email).toBe(testUser.email);
        expect(res.body).not.toHaveProperty('password');
      });
  });

  it('/users/register (POST), failed registration, duplicate email', async () => {
    await request(testSetup.app.getHttpServer())
      .post('/users/register')
      .send(testUser);

    return await request(testSetup.app.getHttpServer())
      .post('/users/register')
      .send(testUser)
      .expect(409);
  });
});

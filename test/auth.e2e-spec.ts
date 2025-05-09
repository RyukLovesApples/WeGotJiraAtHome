import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { TestSetup } from './test.setup';
import { CreateUserDto } from 'src/users/create-user.dto';
import { User } from 'src/users/users.entity';
import { LoginResponse } from 'src/users/login-user.response';
import * as bcrypt from 'bcrypt';

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

  const testUser: CreateUserDto = {
    username: 'adonis',
    email: 'adonis@test.com',
    password: 'Password123%',
  };

  // Registration tests
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

  it('/users/register (POST), should hash the password before saving to the DB', async () => {
    await request(testSetup.app.getHttpServer())
      .post('/users/register')
      .send(testUser)
      .expect(201);

    const { dataSource } = testSetup;
    const savedUser = (await dataSource
      .getRepository(User)
      .findOne({ where: { email: testUser.email } })) as User;

    expect(savedUser).toBeDefined();
    expect(savedUser.password).not.toBe(testUser.password);
    const isMatch = await bcrypt.compare(testUser.password, savedUser.password);
    expect(isMatch).toBe(true);
  });

  it('/users/register (POST), should fail with missing email', async () => {
    const invalidUser = { ...testUser, email: '' };
    await request(testSetup.app.getHttpServer())
      .post('/users/register')
      .send(invalidUser)
      .expect(400);
  });

  // Login tests
  it('/users/login (POST), successful login with JWT response', async () => {
    await request(testSetup.app.getHttpServer())
      .post('/users/register')
      .send(testUser)
      .expect(201);

    return await request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200)
      .expect((res: { body: LoginResponse }) => {
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body.accessToken).toMatch(/^[A-Za-z0-9-._~+/]+=*$/);
      });
  });
});

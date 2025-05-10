import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { TestSetup } from './test.setup';
import { CreateUserDto } from 'src/users/create-user.dto';
import { User } from 'src/users/users.entity';
import { LoginResponse } from 'src/users/login-user.response';
import * as bcrypt from 'bcrypt';

describe('AuthController (e2e)', () => {
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

  type HttpErrorResponse = {
    message: string[];
    error: string;
    statusCode: number;
  };

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
  it('/auth/login (POST), successful login with JWT response', async () => {
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

  it('/auth/login (POST), failed login, empty password', async () => {
    await request(testSetup.app.getHttpServer())
      .post('/users/register')
      .send(testUser)
      .expect(201);

    return request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: '' })
      .expect(400)
      .expect((res) => {
        if (res.error && 'text' in res.error) {
          const errorBody = JSON.parse(res.error.text) as HttpErrorResponse;
          expect(errorBody.message).toContain('password should not be empty');
        }
      });
  });

  it('/auth/login (POST), failed login, not an email format', async () => {
    await request(testSetup.app.getHttpServer())
      .post('/users/register')
      .send(testUser)
      .expect(201);

    return request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'adonisgmail.com', password: testUser.password })
      .expect(400)
      .expect((res) => {
        if (res.error && 'text' in res.error) {
          const errorBody = JSON.parse(res.error.text) as HttpErrorResponse;
          expect(errorBody.message).toContain('email must be an email');
        }
      });
  });

  it('/auth/login (POST), failed login, unautherized, email does not exist', async () => {
    await request(testSetup.app.getHttpServer())
      .post('/users/register')
      .send(testUser)
      .expect(201);

    return request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'adonis@gmail.com', password: testUser.password })
      .expect(404)
      .expect((res) => {
        if (res.error && 'text' in res.error) {
          const errorBody = JSON.parse(res.error.text) as HttpErrorResponse;
          expect(errorBody.message).toContain(
            `User with email adonis@gmail.com does not exist`,
          );
        }
      });
  });

  it('/auth/login (POST), failed login, password does not match', async () => {
    await request(testSetup.app.getHttpServer())
      .post('/users/register')
      .send(testUser)
      .expect(201);

    return request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: 'adonis' })
      .expect(401)
      .expect((res) => {
        if (res.error && 'text' in res.error) {
          const errorBody = JSON.parse(res.error.text) as HttpErrorResponse;
          expect(errorBody.message).toContain(
            'Password or email does not match',
          );
        }
      });
  });
});

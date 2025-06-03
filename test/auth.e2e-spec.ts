import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { TestSetup } from './test.setup';
import { User } from 'src/users/users.entity';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/users/role.enum';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { AdminResponse } from '../src/users/responses/Admin.response';
import { Http2Server } from 'http2';
import { testUser } from './mockVariables/mockVariables';
import {
  LoginResponse,
  // HttpErrorResponse,
  RegisterResponse,
} from './types/test.types';
import {
  createUserWithRole,
  loginUser,
  parseErrorText,
  registerUser,
} from './helpers/test-helpers';

describe('AuthController (e2e)', () => {
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

  describe('Registration', () => {
    it('/users/register (POST), successfully registered, no password exposure', () => {
      return request(server)
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
      await registerUser(server, testUser);
      return request(server).post('/users/register').send(testUser).expect(409);
    });
    it('/users/register (POST), should hash the password before saving to the DB', async () => {
      await registerUser(server, testUser);
      const { dataSource } = testSetup;
      const savedUser = (await dataSource
        .getRepository(User)
        .findOne({ where: { email: testUser.email } })) as User;
      expect(savedUser).toBeDefined();
      expect(savedUser.password).not.toBe(testUser.password);
      const isMatch = await bcrypt.compare(
        testUser.password,
        savedUser.password,
      );
      expect(isMatch).toBe(true);
    });
    it('/users/register (POST), should fail with missing email', async () => {
      const invalidUser = { ...testUser, email: '' };
      await request(server)
        .post('/users/register')
        .send(invalidUser)
        .expect(400);
    });
  });

  describe('Login', () => {
    it('/auth/login (POST), successful login with JWT response', async () => {
      await registerUser(server, testUser);
      return loginUser(server, testUser)
        .expect(200)
        .expect((res: { body: LoginResponse }) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body.accessToken).toMatch(/^[A-Za-z0-9-._~+/]+=*$/);
        });
    });
    it('/auth/login (POST), failed login, empty password', async () => {
      await registerUser(server, testUser);
      return loginUser(server, { ...testUser, password: '' })
        .expect(400)
        .expect((res) => {
          const errorBody = parseErrorText(res);
          expect(errorBody?.message).toContain('password should not be empty');
        });
    });
    it('/auth/login (POST), failed login, not an email format', async () => {
      await registerUser(server, testUser);
      return loginUser(server, { ...testUser, email: 'adonisgmail.com' })
        .expect(400)
        .expect((res) => {
          const errorBody = parseErrorText(res);
          expect(errorBody?.message).toContain('email must be an email');
        });
    });
    it('/auth/login (POST), failed login, unautherized, email does not exist', async () => {
      await registerUser(server, testUser);
      return loginUser(server, { ...testUser, email: 'adonis@gmail.com' })
        .expect(404)
        .expect((res) => {
          const errorBody = parseErrorText(res);
          expect(errorBody?.message).toContain(
            `User with email adonis@gmail.com does not exist`,
          );
        });
    });
    it('/auth/login (POST), failed login, password does not match', async () => {
      await registerUser(server, testUser);
      return loginUser(server, { ...testUser, password: 'adonis' })
        .expect(401)
        .expect((res) => {
          const errorBody = parseErrorText(res);
          expect(errorBody?.message).toContain(
            'Password or email does not match',
          );
        });
    });
  });

  describe('Guards (auth/role-based)', () => {
    it('/auth/profile (GET), successful access through auth guard, response includes email, username but password it not exposed', async () => {
      await registerUser(server, testUser);
      const response = await loginUser(server, testUser);
      const token = (response.body as LoginResponse).accessToken;
      return request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: { body: User }) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.email).toBe(testUser.email);
          expect(res.body.username).toBe(testUser.username);
          expect(res.body).not.toHaveProperty('password');
        });
    });
    it('auth/profile (GET), failed access through auth guard', async () => {
      const incorrectToken = 'asödlfklöökasdfjsdflök';
      return request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${incorrectToken}`)
        .expect(401);
    });
    // place related guard in feature in separate section
    // it('/tasks (GET), unauthorized access without login, test global auth guard', async () => {
    //   return request(server)
    //     .get('/tasks')
    //     .expect(401)
    //     .expect((res: { body: HttpErrorResponse }) => {
    //       expect(res.body.message).toContain('Unauthorized');
    //     });
    // });
    it('should check JWT payload data and include user role in response', async () => {
      await createUserWithRole(testSetup.app, testUser, [Role.ADMIN]);
      const response = await loginUser(server, testUser);
      const token = (response.body as LoginResponse).accessToken;
      const jwtData: JwtPayload = testSetup.app.get(JwtService).verify(token);
      expect(jwtData.sub).toBeDefined();
      expect(jwtData.username).toBeDefined();
      expect(jwtData.roles).toBeDefined();
      expect(jwtData.roles).toContain(Role.ADMIN);
      expect(jwtData.password).not.toBeDefined();
      expect(jwtData.email).not.toBeDefined();
    });
    it('/auth/admin role guard should protect route (GET), successful access', async () => {
      await createUserWithRole(testSetup.app, testUser, [Role.ADMIN]);
      const response = await loginUser(server, testUser);
      const token = (response.body as LoginResponse).accessToken;
      return request(server)
        .get('/auth/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: { body: AdminResponse }) => {
          expect(res.body.message).toBe('This is for admin only!');
        });
    });
    it('/auth/admin role guard should protect route (GET), access denied, role not defined', async () => {
      await registerUser(server, testUser);
      const response = await loginUser(server, testUser);
      const token = (response.body as LoginResponse).accessToken;
      return request(server)
        .get('/auth/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
    it('/users/register (POST), should not allow to register as admin, should stripe roles and return default user', async () => {
      return await request(server)
        .post('/users/register')
        .send({ ...testUser, roles: [Role.ADMIN] })
        .expect(201)
        .expect((res: { body: User }) => {
          expect(res.body.roles).toEqual([Role.USER]);
        });
    });
  });
});

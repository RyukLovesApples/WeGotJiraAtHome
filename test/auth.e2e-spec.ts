import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { TestSetup } from './test.setup';
import { CreateUserDto } from 'src/users/create-user.dto';
import { User } from 'src/users/users.entity';
import * as bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from 'src/users/role.enum';
import { PasswordService } from 'src/users/password/password.service';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { AdminResponse } from '../src/users/responses/Admin.response';
import { Http2Server } from 'http2';
import Test from 'supertest/lib/test';
import { testUser } from './mockVariables/mockVariables';
import {
  LoginResponse,
  HttpErrorResponse,
  RegisterResponse,
} from './types/test.types';

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

  const registerUser = async (user: CreateUserDto) => {
    return await request(server).post('/users/register').send(user).expect(201);
  };

  const loginUser = (user: CreateUserDto): Test => {
    return request(server).post('/auth/login').send(user);
  };

  const createUserWithRole = async (user: CreateUserDto, roles: Role[]) => {
    const userRepo: Repository<User> = testSetup.app.get(
      getRepositoryToken(User),
    );
    await userRepo.save({
      ...user,
      roles,
      password: await testSetup.app
        .get(PasswordService)
        .hashPassword(user.password),
    });
  };

  // Registration tests
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
    await request(server).post('/users/register').send(testUser);
    return request(server).post('/users/register').send(testUser).expect(409);
  });

  it('/users/register (POST), should hash the password before saving to the DB', async () => {
    await registerUser(testUser);
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
    await request(server).post('/users/register').send(invalidUser).expect(400);
  });

  // Login tests
  it('/auth/login (POST), successful login with JWT response', async () => {
    await registerUser(testUser);
    return loginUser(testUser)
      .expect(200)
      .expect((res: { body: LoginResponse }) => {
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body.accessToken).toMatch(/^[A-Za-z0-9-._~+/]+=*$/);
      });
  });

  it('/auth/login (POST), failed login, empty password', async () => {
    await registerUser(testUser);
    return loginUser({ ...testUser, password: '' })
      .expect(400)
      .expect((res) => {
        if (res.error && 'text' in res.error) {
          const errorBody = JSON.parse(res.error.text) as HttpErrorResponse;
          expect(errorBody.message).toContain('password should not be empty');
        }
      });
  });

  it('/auth/login (POST), failed login, not an email format', async () => {
    await registerUser(testUser);
    return loginUser({ ...testUser, email: 'adonisgmail.com' })
      .expect(400)
      .expect((res) => {
        if (res.error && 'text' in res.error) {
          const errorBody = JSON.parse(res.error.text) as HttpErrorResponse;
          expect(errorBody.message).toContain('email must be an email');
        }
      });
  });

  it('/auth/login (POST), failed login, unautherized, email does not exist', async () => {
    await registerUser(testUser);
    return loginUser({ ...testUser, email: 'adonis@gmail.com' })
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
    await registerUser(testUser);
    return loginUser({ ...testUser, password: 'adonis' })
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
  // Guard tests
  it('/auth/profile (GET), successful access through auth guard, response includes email, username but password it not exposed', async () => {
    await registerUser(testUser);
    const response = await loginUser(testUser);
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

  it('/tasks (GET), unauthorized access without login, test global auth guard', async () => {
    return request(server)
      .get('/tasks')
      .expect(401)
      .expect((res: { body: HttpErrorResponse }) => {
        expect(res.body.message).toContain('Unauthorized');
      });
  });

  it('should check JWT payload data and include user role in response', async () => {
    await createUserWithRole(testUser, [Role.ADMIN]);
    const response = await loginUser(testUser);
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
    await createUserWithRole(testUser, [Role.ADMIN]);
    const response = await loginUser(testUser);
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
    await registerUser(testUser);
    const response = await loginUser(testUser);
    const token = (response.body as LoginResponse).accessToken;
    return request(server)
      .get('/auth/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
  it('/users/register (POST), should not allow to register as admin', async () => {
    return await request(server)
      .post('/users/register')
      .send({ ...testUser, roles: [Role.ADMIN] })
      .expect(201)
      .expect((res: { body: User }) => {
        expect(res.body.roles).toEqual([Role.USER]);
      });
  });
});

import * as request from 'supertest';
import { Http2Server } from 'http2';
import { CreateUserDto } from 'src/users/create-user.dto';
import { Role } from 'src/users/role.enum';
import { Test } from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PasswordService } from 'src/users/password/password.service';
import { User } from 'src/users/users.entity';
import { INestApplication } from '@nestjs/common';
import {
  CreateTaskResponse,
  HttpErrorResponse,
  LoginResponse,
} from 'test/types/test.types';
import { CreateTaskDto } from 'src/tasks/create-task.dto';
import { Task } from 'src/tasks/task.entity';

export const registerUser = (
  server: Http2Server,
  user: CreateUserDto,
): Test => {
  return request(server).post('/users/register').send(user).expect(201);
};

export const loginUser = (server: Http2Server, user: CreateUserDto): Test => {
  return request(server).post('/auth/login').send(user);
};

export const createUserWithRole = async (
  app: INestApplication,
  user: CreateUserDto,
  roles: Role[],
) => {
  const userRepo: Repository<User> = app.get(getRepositoryToken(User));
  await userRepo.save({
    ...user,
    roles,
    password: await app.get(PasswordService).hashPassword(user.password),
  });
};

export const registerAndLogin = async (
  server: Http2Server,
  user: CreateUserDto,
): Promise<string> => {
  await request(server).post('/users/register').send(user);
  const response: { body: LoginResponse } = await request(server)
    .post('/auth/login')
    .send({
      email: user.email,
      password: user.password,
    });
  const token = response.body.accessToken;
  return token;
};

export const createTask = async (
  server: Http2Server,
  user: CreateUserDto,
  task: CreateTaskDto,
  noReturn?: string,
): Promise<CreateTaskResponse | void> => {
  const token = await registerAndLogin(server, user);
  const response: { body: Task } = await request(server)
    .post('/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send(task)
    .expect(201);
  if (!noReturn) return { data: response.body, token };
};

export const parseErrorText = (
  res: request.Response,
): HttpErrorResponse | void => {
  if (res.error && 'text' in res.error) {
    const errorBody = JSON.parse(res.error.text) as HttpErrorResponse;
    return errorBody;
  }
};

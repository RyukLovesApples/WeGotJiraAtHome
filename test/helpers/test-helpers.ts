import * as request from 'supertest';
import { Http2Server } from 'http2';
import { CreateUserDto } from 'src/users/dtos/create-user.dto';
import { Role } from 'src/users/role.enum';
import { Test } from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PasswordService } from 'src/users/password/password.service';
import { User } from 'src/users/users.entity';
import { INestApplication } from '@nestjs/common';
import {
  CreateTaskResponse,
  GraphQLErrorResponse,
  GraphQLResponse,
  HttpErrorResponse,
  LoginResponse,
} from 'test/types/test.types';
import { CreateTaskDto } from 'src/tasks/dtos/create-task.dto';
import { Task } from 'src/tasks/task.entity';
import { CreateProjectDto } from 'src/projects/dtos/create-project.dto';
import { CreateProjectUserInput } from 'src/project-users/dtos/create-project-user.dto';
import { ProjectUserDto } from 'src/project-users/dtos/project-user.dto';

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
  baseUrl: string,
  noReturn?: string,
): Promise<CreateTaskResponse | void> => {
  const token = await registerAndLogin(server, user);
  const response: { body: Task } = await request(server)
    .post(`${baseUrl}/tasks`)
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

export const createProject = (
  server: Http2Server,
  token: string,
  project: CreateProjectDto,
): Test => {
  return request(server)
    .post('/projects')
    .set('Authorization', `Bearer ${token}`)
    .send(project);
};

export const logErrorAndFail = (response: {
  body: { errors?: GraphQLErrorResponse[] };
}) => {
  if (response.body?.errors?.length) {
    const message = response.body.errors[0].message;
    console.error(message);
    throw new Error(message);
  }
};

// GraphQL

export const createProjectUser = async (
  server: Http2Server,
  variables: { input: CreateProjectUserInput },
  accessToken: string,
): Promise<
  GraphQLResponse<{
    createProjectUser: ProjectUserDto;
  }>
> => {
  const mutation = `
  mutation CreateProjectUser($projectId: String!, $input: CreateProjectUserInput!) {
    createProjectUser(projectId: $projectId, input: $input) {
      id
      userId
      projectId
      role
    }
  }
`;
  return await request(server)
    .post('/graphql')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      query: mutation,
      variables,
    });
};

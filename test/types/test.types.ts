import { Task } from 'src/tasks/task.entity';

export interface RegisterResponse {
  username: string;
  email: string;
}

export type HttpErrorResponse = {
  message: string[];
  error: string;
  statusCode: number;
};

export interface LoginResponse {
  accessToken: string;
}

export interface CreateTaskResponse {
  data: Task;
  token: string;
}

export interface GraphQLErrorResponse {
  message: string;
  locations?: { line: number; column: number }[];
  path?: (string | number)[];
  extensions?: Record<string, any>;
  [key: string]: any;
}

export type GraphQLResponse<T> = {
  body: { data?: T; errors?: GraphQLErrorResponse[] };
};

import { CreateTaskDto } from 'src/tasks/dtos/create-task.dto';
import { TaskStatus } from 'src/tasks/task-status.enum';
import { CreateUserDto } from 'src/users/dtos/create-user.dto';

export const defaultUser: CreateUserDto = {
  username: 'adonis',
  email: 'adonis@test.com',
  password: 'Password123%',
};

export const secondUser: CreateUserDto = {
  username: 'daniel',
  email: 'daniel@test.com',
  password: 'Password321%',
};

export const thirdUser: CreateUserDto = {
  username: 'julia',
  email: 'julia@test.com',
  password: 'Password231%',
};

export const invitedUser: CreateUserDto = {
  username: 'john',
  email: 'john@test.com',
  password: 'Password321%',
};

export const unauthorizedUser: CreateUserDto = {
  username: 'smith',
  email: 'smith@test.com',
  password: 'Password123%1',
};

export const dummyTasks: CreateTaskDto[] = [
  {
    title: '1 test task',
    description: '4testing tasks for crud and access0',
    status: TaskStatus.CLOSED,
  },
  {
    title: '2 test task',
    description: '3testing tasks for crud and access1 keyword',
    status: TaskStatus.CLOSED,
  },
  {
    title: '3 test task',
    description: '2testing tasks for crud and access2 keyword',
    status: TaskStatus.OPEN,
  },
  {
    title: '4 test task3',
    description: '1testing tasks for crud and access3',
    status: TaskStatus.IN_PROGRESS,
  },
];

export const dummyProjects = [
  {
    name: 'test1',
    description: 'test description1',
  },
  {
    name: 'test2',
    description: 'test description2',
  },
  {
    name: 'test3',
    description: 'test description3',
  },
];

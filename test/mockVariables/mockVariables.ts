import { CreateTaskDto } from 'src/tasks/create-task.dto';
import { TaskStatus } from 'src/tasks/task.model';
import { CreateUserDto } from 'src/users/create-user.dto';

export const testUser: CreateUserDto = {
  username: 'adonis',
  email: 'adonis@test.com',
  password: 'Password123%',
};

export const unauthorizedUser: CreateUserDto = {
  username: 'adonis1',
  email: 'adonis1@test.com',
  password: 'Password123%1',
};

export const mockTasks: CreateTaskDto[] = [
  {
    title: 'test task0',
    description: 'testing tasks for crud and access0',
    status: TaskStatus.OPEN,
  },
  {
    title: 'test task1',
    description: 'testing tasks for crud and access1',
    status: TaskStatus.OPEN,
  },
  {
    title: 'test task2',
    description: 'testing tasks for crud and access2',
    status: TaskStatus.OPEN,
  },
  {
    title: 'test task3',
    description: 'testing tasks for crud and access3',
    status: TaskStatus.OPEN,
  },
];

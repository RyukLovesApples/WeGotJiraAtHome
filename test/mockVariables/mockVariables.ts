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

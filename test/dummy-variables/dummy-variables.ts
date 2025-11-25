import { CreateEpicDto } from 'src/epics/dtos/create-epic.dto';
import { EpicPriority } from 'src/epics/enums/epic-priority.enum';
import { EpicStatus } from 'src/epics/enums/epic-status.enum';
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

export const dummyEpics: CreateEpicDto[] = [
  {
    name: 'Set up Deployment Pipeline for Feature X',
    priority: EpicPriority.HIGH,
  },
  {
    name: 'Complete Full Security Audit and Patching',
    description:
      'Review third-party library dependencies and apply security updates. Document findings.',
    status: EpicStatus.IN_PROGRESS,
    priority: EpicPriority.HIGH,
    startDate: new Date('2025-10-20'),
    dueDate: new Date('2025-11-05'),
    archived: false,
    color: '#FF0000',
  },
  {
    name: 'Refactor old Task Resolver Endpoints',
    description:
      'Standardize error handling and remove deprecated fields from the GraphQL layer.',
    status: EpicStatus.TODO,
    priority: EpicPriority.MEDIUM,
    startDate: new Date('2026-01-01'),
    dueDate: new Date('2026-02-01'),
    ownerId: 'b9c8d7e6-f5g4-3210-9876-54321fedcba0',
    archived: false,
  },
  {
    name: 'Initial Database Schema Design',
    priority: EpicPriority.LOW,
    status: EpicStatus.DONE,
    description: 'Finalized relationships and indexing for the core entities.',
    archived: true,
    color: '#6c757d', // Grey for archived
  },
];

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus } from './task-status.enum';
import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { WrongTaskStatusException } from './exceptions/wrong-task-status.exeption';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { In, Repository } from 'typeorm';
import { User } from 'src/users/users.entity';
import { TaskLabel } from './task-label.entity';
import { CreateTaskLabelDto } from './dtos/create-task-label.dto';
import { FindTaskParams } from './params/find-task.params';
import { PaginationParams } from './params/task-pagination.params';
import { UpdateEmbeddedTaskDto } from './dtos/update-embedded-task.dto';
import { buildTaskTree } from './utils/build-task-tree';
import { plainToInstance } from 'class-transformer';
import { TaskDto } from './dtos/task.dto';
import { Epic } from 'src/epics/epics.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Epic)
    private epicRepository: Repository<Epic>,
    @InjectRepository(TaskLabel)
    private labelRepository: Repository<TaskLabel>,
  ) {}

  public async getAll(
    filters: FindTaskParams,
    pagination: PaginationParams,
    epicId: string,
  ): Promise<[TaskDto[], number]> {
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.user', 'user')
      .leftJoinAndSelect('task.labels', 'labels')
      .where(`task.epicId = :epicId`, { epicId });

    if (filters.status) {
      queryBuilder.andWhere('task.status = :status', {
        status: filters.status,
      });
    }

    const search = filters.search?.trim();

    if (search) {
      queryBuilder.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (filters.labels?.length) {
      const subQuery = queryBuilder
        .subQuery()
        .select('labels.taskId')
        .from('task_label', 'labels')
        .where('labels.name IN (:...names)', {
          names: filters.labels,
        })
        .getQuery();
      queryBuilder.andWhere(`task.id IN ${subQuery}`);
    }
    queryBuilder.orderBy(
      `task.${filters.sortBy || 'createdAt'}`,
      filters.sortingOrder || 'DESC',
    );
    queryBuilder.skip(pagination.offset).take(pagination.limit);
    const [flatTasks, total] = await queryBuilder.getManyAndCount();
    const dtos = plainToInstance(TaskDto, flatTasks, {
      excludeExtraneousValues: true,
    });

    const tree = buildTaskTree(dtos);
    return [tree, total];
  }

  public async getOneTask(
    epicId: string,
    taskId: string,
  ): Promise<Task | null> {
    return await this.taskRepository.findOne({
      where: { epicId, id: taskId },
      relations: ['labels', 'user', 'subtasks', 'subtasks.labels'],
    });
  }

  public async create(
    createTaskDto: CreateTaskDto,
    userId: string,
    projectId: string,
    epicId: string,
  ): Promise<Task> {
    const epic = await this.epicRepository.findOneBy({ id: epicId });
    if (!epic) throw new NotFoundException('Epic not found');

    if (epic.archived) {
      throw new BadRequestException('Cannot create tasks on an archived epic.');
    }

    const user = await this.userRepository.findOneBy({
      id: userId,
    });

    if (!user) throw new NotFoundException('User not found');

    if (createTaskDto.labels) {
      createTaskDto.labels = this.uniqueLabels(createTaskDto.labels);
    }

    const labels = createTaskDto.labels?.map((label) =>
      this.labelRepository.create({ name: label.name }),
    );

    const newTask = this.taskRepository.create({
      title: createTaskDto.title,
      description: createTaskDto.description,
      status: createTaskDto.status,
      userId: userId,
      labels: labels,
      epicId,
      projectId,
    });

    const task: Task = await this.taskRepository.save(newTask);
    return task;
  }

  public async createSubtask(
    parentId: string,
    createTaskDto: CreateTaskDto,
    userId: string,
    projectId: string,
    epicId: string,
  ): Promise<Task> {
    const epic = await this.epicRepository.findOneBy({ id: epicId });
    if (!epic) throw new NotFoundException('Epic not found');

    if (epic.archived) {
      throw new BadRequestException(
        'Cannot create subtasks on an archived epic.',
      );
    }

    const parentTask = await this.taskRepository.findOne({
      where: { id: parentId },
    });

    if (!parentTask) throw new NotFoundException('Parent task not found');

    if (parentTask.epicId !== epicId) {
      throw new BadRequestException('Parent task does not belong to this Epic');
    }

    if (parentTask.layer >= 2) {
      throw new BadRequestException('Max task depth (3 levels) reached');
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    if (createTaskDto.labels) {
      createTaskDto.labels = this.uniqueLabels(createTaskDto.labels);
    }

    const labels = createTaskDto.labels?.map((label) =>
      this.labelRepository.create({ name: label.name }),
    );

    const newTask = this.taskRepository.create({
      title: createTaskDto.title,
      description: createTaskDto.description,
      status: createTaskDto.status || TaskStatus.OPEN,
      userId,
      labels,
      epicId,
      projectId,
      parentId: parentTask.id,
      layer: parentTask.layer + 1,
    });

    return await this.taskRepository.save(newTask);
  }

  public async assignTask(taskId: string, userId: string): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const epic = await this.epicRepository.findOneBy({ id: task.epicId });

    if (epic?.archived)
      throw new BadRequestException('Cannot assign tasks in an archived epic.');

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    task.assignedToId = userId;
    return await this.taskRepository.save(task);
  }

  public async updateTask(
    task: Task,
    updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    if (
      updateTaskDto.status &&
      !this.isValidStatusTransition(task.status, updateTaskDto.status)
    ) {
      throw new WrongTaskStatusException(task.status, updateTaskDto.status);
    }
    if (updateTaskDto.labels) {
      updateTaskDto.labels = this.uniqueLabels(updateTaskDto.labels);
    }
    Object.assign(task, updateTaskDto);
    return await this.taskRepository.save(task);
  }

  public async updateTaskById(
    epicId: string,
    updateDto: UpdateEmbeddedTaskDto,
  ): Promise<Task> {
    const epic = await this.epicRepository.findOneBy({ id: epicId });
    if (!epic) throw new NotFoundException('Epic not found');

    if (epic.archived) {
      throw new BadRequestException('Cannot update tasks in an archived epic.');
    }

    const task = await this.getOneTask(epicId, updateDto.id);
    if (!task) throw new NotFoundException('Task not found!');

    if (
      updateDto.status &&
      !this.isValidStatusTransition(task.status, updateDto.status)
    ) {
      throw new WrongTaskStatusException(task.status, updateDto.status);
    }

    if (updateDto.labels) {
      updateDto.labels = this.uniqueLabels(updateDto.labels);
    }

    Object.assign(task, updateDto);
    return await this.taskRepository.save(task);
  }

  public async delete(task: Task): Promise<void> {
    const epic = await this.epicRepository.findOneBy({ id: task.epicId });

    if (epic?.archived) {
      throw new BadRequestException(
        'Cannot delete tasks belonging to an archived epic.',
      );
    }
    await this.taskRepository.delete(task.id);
  }

  public async addLabels(
    epicId: string,
    taskId: string,
    labelDto: CreateTaskLabelDto[],
  ): Promise<Task> {
    const task = await this.getOneTask(epicId, taskId);
    if (!task) throw new NotFoundException('Task not found');

    const epic = await this.epicRepository.findOneBy({ id: epicId });
    if (epic?.archived) {
      throw new BadRequestException(
        'Cannot modify labels on an archived epic.',
      );
    }

    const existingLabelNames = new Set(task.labels!.map((label) => label.name));

    const labels = this.uniqueLabels(labelDto)
      .filter((dto) => !existingLabelNames.has(dto.name))
      .map((label) => this.labelRepository.create({ ...label, task }));
    if (labels.length > 0) {
      await this.labelRepository.save(labels);
      task.labels = [...task.labels!, ...labels];
      return await this.taskRepository.save(task);
    }
    return task;
  }

  public async removeLabel(
    epicId: string,
    taskId: string,
    labelIds: string[],
  ): Promise<void> {
    const task = await this.getOneTask(epicId, taskId);
    if (!task) throw new NotFoundException('Task not found');

    const epic = await this.epicRepository.findOneBy({ id: epicId });
    if (epic?.archived) {
      throw new BadRequestException(
        'Cannot modify labels on an archived epic.',
      );
    }

    await this.labelRepository.delete({
      id: In(labelIds),
      taskId,
    });
  }

  private isValidStatusTransition(
    currentStatus: TaskStatus,
    newStatus: TaskStatus,
  ): boolean {
    const statusOrder = [
      TaskStatus.OPEN,
      TaskStatus.IN_PROGRESS,
      TaskStatus.CLOSED,
    ];
    return statusOrder.indexOf(currentStatus) <= statusOrder.indexOf(newStatus);
  }

  private uniqueLabels(labelDto: CreateTaskLabelDto[]): CreateTaskLabelDto[] {
    const uniques = [...new Set(labelDto.map((label) => label.name))];
    return uniques.map((name) => ({ name }));
  }
}

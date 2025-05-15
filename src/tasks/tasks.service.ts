import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus } from './task.model';
import { CreateTaskDto } from './create-task.dto';
import { UpdateTaskDto } from './update-task.dto';
import { WrongTaskStatusException } from './exeptions/wrong-task-status.exeption';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/users.entity';
import { TaskLabel } from './task-label.entity';
import { CreateTaskLabelDto } from './create-task-label.dto';
import { FindTaskParams } from './find-task.params';
import { PaginationParams } from './task-pagination.params';
import { plainToInstance } from 'class-transformer';
import { TaskDto } from './task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TaskLabel)
    private labelRepository: Repository<TaskLabel>,
  ) {}

  public async getAll(
    filters: FindTaskParams,
    pagination: PaginationParams,
    userId: string,
  ): Promise<[Task[], number]> {
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.user', 'user')
      .leftJoinAndSelect('task.labels', 'labels')
      .where(`task.userId = :userId`, { userId });
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
    // log for the sql query -> getSql()
    // console.log(queryBuilder.getSql());
    const [items, total] = await queryBuilder.getManyAndCount();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const tasks = plainToInstance(Task, items) as Task[];
    return [tasks, total];
  }

  public async getOneTask(id: string): Promise<Task | null> {
    return await this.taskRepository.findOne({
      where: { id },
      relations: ['labels', 'user'],
    });
  }

  public async create(
    createTaskDto: CreateTaskDto,
    userId: string,
  ): Promise<TaskDto> {
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
      user: user,
      labels: labels,
    });

    const task: Task = await this.taskRepository.save(newTask);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return plainToInstance(TaskDto, task, {
      excludeExtraneousValues: true,
    }) as TaskDto;
  }

  public async updateTask(
    task: Task,
    updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    if (
      updateTaskDto.status &&
      !this.isValidStatusTransition(task.status, updateTaskDto.status)
    ) {
      throw new WrongTaskStatusException();
    }
    if (updateTaskDto.labels) {
      updateTaskDto.labels = this.uniqueLabels(updateTaskDto.labels);
    }
    Object.assign(task, updateTaskDto);
    return await this.taskRepository.save(task);
  }

  public async delete(task: Task): Promise<void> {
    try {
      await this.taskRepository.delete(task.id);
    } catch (error) {
      console.error('Could not delete task: ', error);
      throw new InternalServerErrorException('Failed to delete task');
    }
  }

  public async addLabels(
    id: string,
    labelDto: CreateTaskLabelDto[],
  ): Promise<Task> {
    const task = await this.getOneTask(id);
    if (!task) throw new NotFoundException('Task not found');
    const existingLabelNames = new Set(task.labels!.map((label) => label.name));
    const labels = this.uniqueLabels(labelDto)
      .filter((dto) => !existingLabelNames.has(dto.name))
      .map((label) => this.labelRepository.create(label));
    if (labels.length > 0) {
      task.labels = [...task.labels!, ...labels];
      return await this.taskRepository.save(task);
    }
    return task;
  }

  public async removeLabel(id: string, lables: string[]): Promise<Task> {
    const task = await this.getOneTask(id);
    if (!task) throw new NotFoundException('Task not found');
    task.labels = task.labels!.filter((label) => !lables.includes(label.name));
    return await this.taskRepository.save(task);
  }
  // simple valid logic for changing status. open -> in progress -> closed
  // for frontend should change the function to send message to client if he is sure
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

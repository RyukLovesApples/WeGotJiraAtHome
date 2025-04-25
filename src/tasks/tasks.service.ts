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
  ): Promise<[Task[], number]> {
    try {
      const queryBuilder = this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.labels', 'labels');
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
      queryBuilder.orderBy(`task.${filters.sortBy}`, filters.sortingOrder);
      queryBuilder.skip(pagination.offset).take(pagination.limit);
      // log for the aktuell sql query -> getSql()
      // console.log(queryBuilder.getSql());
      return await queryBuilder.getManyAndCount();
    } catch (error) {
      console.error('Could not load tasks: ', error);
      throw new InternalServerErrorException('Failed to retrieve tasks');
    }
  }

  public async getOneTask(id: string): Promise<Task | null> {
    try {
      return await this.taskRepository.findOne({
        where: { id },
        relations: ['labels', 'user'],
      });
    } catch (error) {
      console.error('Could not load a task by id: ', error);
      throw new InternalServerErrorException(
        `Failed to retrieve task with id ${id}`,
      );
    }
  }

  public async create(createTaskDto: CreateTaskDto): Promise<Task> {
    try {
      const user = await this.userRepository.findOneBy({
        id: createTaskDto.userId,
      });
      if (!user) throw new NotFoundException('User not found');
      if (createTaskDto.labels) {
        createTaskDto.labels = this.uniqueLabels(createTaskDto.labels);
      }
      const labels = createTaskDto.labels?.map((label) =>
        this.labelRepository.create({ name: label.name }),
      );

      const task = this.taskRepository.create({
        title: createTaskDto.title,
        description: createTaskDto.description,
        status: createTaskDto.status,
        user: user,
        labels: labels,
      });

      return await this.taskRepository.save(task);
    } catch (error) {
      console.error('Could not create new task: ', error);
      throw new InternalServerErrorException('Failed to create task');
    }
  }

  public async updateTask(
    task: Task,
    updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    try {
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
    } catch (error) {
      console.error('Could not update task:', error);
      throw new InternalServerErrorException('Failed to update task');
    }
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
    try {
      const task = await this.getOneTask(id);
      if (!task) throw new NotFoundException('Task not found');
      const existingLabelNames = new Set(
        task.labels.map((label) => label.name),
      );
      const labels = this.uniqueLabels(labelDto)
        .filter((dto) => !existingLabelNames.has(dto.name))
        .map((label) => this.labelRepository.create(label));
      if (labels.length > 0) {
        task.labels = [...task.labels, ...labels];
        return await this.taskRepository.save(task);
      }
      return task;
    } catch (error) {
      console.error('Could not add label to task: ', error);
      throw new InternalServerErrorException('Failed to add labels to task');
    }
  }

  public async removeLabel(id: string, lables: string[]): Promise<Task> {
    try {
      const task = await this.getOneTask(id);
      if (!task) throw new NotFoundException('Task not found');
      task.labels = task.labels.filter((label) => !lables.includes(label.name));
      return await this.taskRepository.save(task);
    } catch (error) {
      console.error('Could not remove label from task: ', error);
      throw new InternalServerErrorException('Failed to add labels to task');
    }
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

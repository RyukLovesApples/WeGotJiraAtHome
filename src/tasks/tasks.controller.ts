import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './create-task.dto';
import { FindOneParams } from './find-one.params';
import { UpdateTaskDto } from './update-task.dto';
import { WrongTaskStatusException } from './exeptions/wrong-task-status.exeption';
import { Task } from './task.entity';
import { CreateTaskLabelDto } from './create-task-label.dto';
import { FindTaskParams } from './find-task.params';
import { PaginationParams } from './task-pagination.params';
import { PaginationResponse } from './pagination.response';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  public async findAll(
    @Query() filters: FindTaskParams,
    @Query() pagination: PaginationParams,
  ): Promise<PaginationResponse<Task>> {
    try {
      const [items, total] = await this.tasksService.getAll(
        filters,
        pagination,
      );
      return {
        data: items,
        meta: {
          total: total,
          limit: pagination.limit,
          offset: pagination.offset,
        },
      };
    } catch {
      throw new InternalServerErrorException('Failed to retrieve tasks');
    }
  }

  @Get('/:id')
  public async findOne(@Param() params: FindOneParams): Promise<Task> {
    try {
      return await this.findOneOrFail(params.id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve the task');
    }
  }

  @Post()
  public async create(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    try {
      return await this.tasksService.create(createTaskDto);
    } catch {
      throw new InternalServerErrorException('Failed to create task');
    }
  }

  @Patch('/:id')
  public async updateTask(
    @Param() params: FindOneParams,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    try {
      const task: Task = await this.findOneOrFail(params.id);
      return await this.tasksService.updateTask(task, updateTaskDto);
    } catch (error) {
      if (error instanceof WrongTaskStatusException) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update task');
    }
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async delete(@Param() params: FindOneParams): Promise<void> {
    try {
      const task: Task = await this.findOneOrFail(params.id);
      await this.tasksService.delete(task);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete task');
    }
  }

  @Post('/:id/labels')
  public async addLabels(
    @Param() param: FindOneParams,
    @Body() labels: CreateTaskLabelDto[],
  ): Promise<Task> {
    try {
      return await this.tasksService.addLabels(param.id, labels);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete task');
    }
  }

  @Delete('/:id/labels')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async removeLabels(
    @Param() { id }: FindOneParams,
    @Body() labels: string[],
  ): Promise<Task> {
    try {
      return this.tasksService.removeLabel(id, labels);
    } catch (error) {
      console.error('Failed to delete label: ', error);
      throw new InternalServerErrorException('Failed to delete labels');
    }
  }

  private async findOneOrFail(id: string): Promise<Task> {
    try {
      const task = await this.tasksService.getOneTask(id);
      if (!task) {
        throw new NotFoundException('Task not found');
      }
      return task;
    } catch (error) {
      console.error('Failed to delete labels: ', error);
      throw new InternalServerErrorException('Failed to delete labels');
    }
  }
}

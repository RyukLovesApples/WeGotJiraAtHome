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
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './create-task.dto';
import { FindOneParams } from './find-one.params';
import { UpdateTaskDto } from './update-task.dto';
import { WrongTaskStatusException } from './exeptions/wrong-task-status.exeption';
import { Task } from './task.entity';
import { CreateTaskLabelDto } from './create-task-label.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  public async findAll(): Promise<Task[]> {
    try {
      return await this.tasksService.getAll();
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

  private async findOneOrFail(id: string): Promise<Task> {
    const task = await this.tasksService.getOneTask(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }
}

// Update only the status of tasks
// @Patch('/:id/status')
// public updateTaskStatus(
//   @Param() params: FindOneParams,
//   @Body() body: UpdateTaskStatusDto,
// ): ITask {
//   const task: ITask = this.findOneOrFail(params.id);
//   task.status = body.status;
//   return task;
// }

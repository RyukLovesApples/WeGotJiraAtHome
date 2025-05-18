import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dtos/create-task.dto';
import { FindOneParams } from './params/find-one.params';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { Task } from './task.entity';
import { CreateTaskLabelDto } from './dtos/create-task-label.dto';
import { FindTaskParams } from './params/find-task.params';
import { PaginationParams } from './params/task-pagination.params';
import { PaginationResponse } from './responses/pagination.response';
import { CurrentUserId } from './../users/decorators/current-user-id.decorator';
import { TaskDto } from './dtos/task.dto';

@Controller('tasks')
@UseInterceptors(ClassSerializerInterceptor)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  public async findAll(
    @Query() filters: FindTaskParams,
    @Query() pagination: PaginationParams,
    @CurrentUserId() userId: string,
  ): Promise<PaginationResponse<Task>> {
    const [items, total] = await this.tasksService.getAll(
      filters,
      pagination,
      userId,
    );

    return {
      data: items,
      meta: {
        total: total,
        limit: pagination.limit,
        offset: pagination.offset,
      },
    };
  }

  @Get('/:id')
  public async findOne(
    @Param() params: FindOneParams,
    @CurrentUserId() userId: string,
  ): Promise<Task> {
    const task = await this.findOneOrFail(params.id);
    this.checkOwnership(task, userId);
    return task;
  }

  @Post()
  public async create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUserId() userId: string,
  ): Promise<TaskDto> {
    return await this.tasksService.create(createTaskDto, userId);
  }

  @Patch('/:id')
  public async updateTask(
    @Param() params: FindOneParams,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUserId() userId: string,
  ): Promise<Task> {
    const task: Task = await this.findOneOrFail(params.id);
    this.checkOwnership(task, userId);
    return await this.tasksService.updateTask(task, updateTaskDto);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async delete(
    @Param() params: FindOneParams,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    const task: Task = await this.findOneOrFail(params.id);
    this.checkOwnership(task, userId);
    await this.tasksService.delete(task);
  }

  @Post('/:id/labels')
  public async addLabels(
    @Param() param: FindOneParams,
    @Body() labels: CreateTaskLabelDto[],
    @CurrentUserId() userId: string,
  ): Promise<Task> {
    const task = await this.findOneOrFail(param.id);
    this.checkOwnership(task, userId);
    return await this.tasksService.addLabels(param.id, labels);
  }

  @Delete('/:id/labels')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async removeLabels(
    @Param() params: FindOneParams,
    @Body() labelIds: string[],
    @CurrentUserId() userId: string,
  ): Promise<Task | null> {
    const task = await this.findOneOrFail(params.id);
    this.checkOwnership(task, userId);
    return this.tasksService.removeLabel(params.id, labelIds);
  }

  private async findOneOrFail(id: string): Promise<Task> {
    const task = await this.tasksService.getOneTask(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  private checkOwnership(task: Task, userId: string) {
    if (task.user.id !== userId) {
      throw new ForbiddenException(
        'Access to task denied. You are not the owner!',
      );
    }
  }
}

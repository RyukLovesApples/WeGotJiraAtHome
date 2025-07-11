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
import { CurrentUserId } from '../users/decorators/current-user-id.decorator';
import { TaskDto } from './dtos/task.dto';
import { transformToDto } from 'src/utils/transform';
import { Resources } from 'src/project-permissions/decorators/resource.decorator';
import { Resource } from 'src/project-permissions/enums/resource.enum';

@Controller()
@Resources(Resource.TASK)
@UseInterceptors(ClassSerializerInterceptor)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  public async findAll(
    @CurrentUserId() _: string,
    @Query() filters: FindTaskParams,
    @Query() pagination: PaginationParams,
    @Param('projectId') projectId: string,
  ): Promise<PaginationResponse<Task>> {
    const [items, total] = await this.tasksService.getAll(
      filters,
      pagination,
      projectId,
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
    @CurrentUserId() _: string,
    @Param() params: FindOneParams,
  ): Promise<TaskDto> {
    const task = await this.findOneOrFail(params.id);
    return transformToDto(TaskDto, task);
  }

  @Post()
  public async create(
    @CurrentUserId() userId: string,
    @Body() createTaskDto: CreateTaskDto,
    @Param('projectId') projectId: string,
  ): Promise<TaskDto> {
    const task = await this.tasksService.create(
      createTaskDto,
      userId,
      projectId,
    );
    return transformToDto(TaskDto, task);
  }

  @Patch('/:id')
  public async updateTask(
    @CurrentUserId() _: string,
    @Param() params: FindOneParams,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<TaskDto> {
    const task: Task = await this.findOneOrFail(params.id);
    const updatedTask = await this.tasksService.updateTask(task, updateTaskDto);
    return transformToDto(TaskDto, updatedTask);
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
  ): Promise<TaskDto> {
    const task = await this.findOneOrFail(param.id);
    this.checkOwnership(task, userId);
    const updatedTask = await this.tasksService.addLabels(param.id, labels);
    return transformToDto(TaskDto, updatedTask);
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

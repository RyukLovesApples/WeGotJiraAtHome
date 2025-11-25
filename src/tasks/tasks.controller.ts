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
import { TaskIdParams } from 'src/common/dtos/params/taskId.params';
import { AssignUserDto } from './dtos/assign-user.dto';
import { EpicIdParams } from 'src/common/dtos/params/epicId.params';
import { ProjectIdParams } from 'src/common/dtos/params/projectId.params';

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
    @Param() { epicId }: EpicIdParams,
  ): Promise<PaginationResponse<TaskDto>> {
    const [tree, total] = await this.tasksService.getAll(
      filters,
      pagination,
      epicId,
    );

    return {
      data: tree,
      meta: {
        total: total,
        limit: pagination.limit,
        offset: pagination.offset,
      },
    };
  }

  @Get(':taskId')
  public async findOne(
    @CurrentUserId() _: string,
    @Param() { epicId }: EpicIdParams,
    @Param() { taskId }: TaskIdParams,
  ): Promise<TaskDto> {
    const task = await this.findOneOrFail(epicId, taskId);
    return transformToDto(TaskDto, task);
  }

  @Post()
  public async create(
    @CurrentUserId() userId: string,
    @Body() createTaskDto: CreateTaskDto,
    @Param() { projectId }: ProjectIdParams,
    @Param() { epicId }: EpicIdParams,
  ): Promise<TaskDto> {
    const task = await this.tasksService.create(
      createTaskDto,
      userId,
      projectId,
      epicId,
    );
    return transformToDto(TaskDto, task);
  }

  @Post(':taskId')
  async createSubtask(
    @CurrentUserId() userId: string,
    @Param() { projectId }: ProjectIdParams,
    @Param() { epicId }: EpicIdParams,
    @Param() { taskId }: TaskIdParams,
    @Body() createTaskDto: CreateTaskDto,
  ): Promise<TaskDto> {
    const subtask = await this.tasksService.createSubtask(
      taskId,
      createTaskDto,
      userId,
      projectId,
      epicId,
    );
    return transformToDto(TaskDto, subtask);
  }

  @Post(':taskId/assign')
  async assignTask(
    @CurrentUserId() _: string,
    @Param() { taskId }: TaskIdParams,
    @Body() dto: AssignUserDto,
  ): Promise<TaskDto> {
    const task = await this.tasksService.assignTask(taskId, dto.userId);
    return transformToDto(TaskDto, task);
  }

  @Patch(':taskId')
  public async updateTask(
    @CurrentUserId() _: string,
    @Param() { epicId }: EpicIdParams,
    @Param() { taskId }: TaskIdParams,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<TaskDto> {
    const task: Task = await this.findOneOrFail(epicId, taskId);
    const updatedTask = await this.tasksService.updateTask(task, updateTaskDto);
    return transformToDto(TaskDto, updatedTask);
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async delete(
    @Param() { epicId }: EpicIdParams,
    @Param() { taskId }: TaskIdParams,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    const task: Task = await this.findOneOrFail(epicId, taskId);
    this.checkOwnership(task, userId);
    await this.tasksService.delete(task);
  }

  @Post(':taskId/labels')
  public async addLabels(
    @Param() { epicId }: EpicIdParams,
    @Param() { taskId }: TaskIdParams,
    @Body() labels: CreateTaskLabelDto[],
    @CurrentUserId() userId: string,
  ): Promise<TaskDto> {
    const task = await this.findOneOrFail(epicId, taskId);
    this.checkOwnership(task, userId);
    const updatedTask = await this.tasksService.addLabels(
      epicId,
      taskId,
      labels,
    );
    return transformToDto(TaskDto, updatedTask);
  }

  @Delete(':taskId/labels')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async removeLabels(
    @Param() { epicId }: EpicIdParams,
    @Param() { taskId }: TaskIdParams,
    @Body() labelIds: string[],
    @CurrentUserId() userId: string,
  ): Promise<void> {
    const task = await this.findOneOrFail(epicId, taskId);
    this.checkOwnership(task, userId);
    await this.tasksService.removeLabel(epicId, taskId, labelIds);
  }

  private async findOneOrFail(epicId: string, taskId: string): Promise<Task> {
    const task = await this.tasksService.getOneTask(epicId, taskId);
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

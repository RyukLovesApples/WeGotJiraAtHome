import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ProjectIdParams } from 'src/common/dtos/params/projectId.params';
import { CurrentUserId } from 'src/users/decorators/current-user-id.decorator';
import { EpicService } from './epics.service';
import { EpicDto } from './dtos/epic.dto';
import { plainToInstance } from 'class-transformer';
import { EpicIdParams } from 'src/common/dtos/params/epicId.params';
import { transformToDto } from 'src/utils/transform';
import { CreateEpicDto } from './dtos/create-epic.dto';
import { UpdateEpicDto } from './dtos/update-epic.dto';
import { Resource } from 'src/project-permissions/enums/resource.enum';
import { Resources } from 'src/project-permissions/decorators/resource.decorator';
import { ActivityGateway } from 'src/activity/activity.gateway';
import { ProjectEvents } from 'src/shared/enums/project-events';

@Controller()
@Resources(Resource.EPIC)
export class EpicController {
  constructor(
    private readonly epicService: EpicService,
    private readonly activityGateway: ActivityGateway,
  ) {}
  @Get()
  async getAll(
    @CurrentUserId() _: string,
    @Param() { projectId }: ProjectIdParams,
  ): Promise<EpicDto[]> {
    const epics = await this.epicService.getAllEpics(projectId);
    return plainToInstance(EpicDto, epics, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':epicId')
  async getOne(
    @CurrentUserId() _: string,
    @Param() { projectId }: ProjectIdParams,
    @Param() { epicId }: EpicIdParams,
  ): Promise<EpicDto> {
    const epic = await this.epicService.getOneEpic(projectId, epicId);
    return transformToDto(EpicDto, epic);
  }

  @Post()
  async create(
    @CurrentUserId() userId: string,
    @Param() { projectId }: ProjectIdParams,
    @Body() createEpicDto: CreateEpicDto,
  ): Promise<EpicDto> {
    const epic = await this.epicService.createEpic(
      userId,
      projectId,
      createEpicDto,
    );
    const transformedEpic = transformToDto(EpicDto, epic);
    this.activityGateway.broadcastProjectEntityChange(
      projectId,
      ProjectEvents.EPIC_CREATED,
      transformedEpic,
    );
    return transformedEpic;
  }

  @Patch(':epicId')
  async update(
    @CurrentUserId() _: string,
    @Param() { projectId }: ProjectIdParams,
    @Param() { epicId }: EpicIdParams,
    @Body() updateEpicDto: UpdateEpicDto,
  ): Promise<EpicDto> {
    const epic = await this.epicService.updateEpic(
      updateEpicDto,
      projectId,
      epicId,
    );
    const transformedEpic = transformToDto(EpicDto, epic);
    this.activityGateway.broadcastProjectEntityChange(
      projectId,
      ProjectEvents.EPIC_UPDATED,
      transformedEpic,
    );
    return transformedEpic;
  }

  @Delete(':epicId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUserId() _: string,
    @Param() { projectId }: ProjectIdParams,
    @Param() { epicId }: EpicIdParams,
  ): Promise<void> {
    await this.epicService.deleteEpic(projectId, epicId);
    this.activityGateway.broadcastProjectEntityChange(
      projectId,
      ProjectEvents.EPIC_DELETED,
      { epicId },
    );
  }
}

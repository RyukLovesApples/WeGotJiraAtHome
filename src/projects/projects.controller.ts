import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dtos/create-project.dto';
import { Public } from 'src/users/decorators/public.decorator';
import { CurrentUserId } from 'src/users/decorators/current-user-id.decorator';
import { ProjectCreationService } from './projects-creation.service';
import { plainToInstance } from 'class-transformer';
import { ProjectDto } from './dtos/project.dto';

@Controller('projects')
@UseInterceptors(ClassSerializerInterceptor)
export class ProjectsController {
  constructor(
    private readonly projectService: ProjectsService,
    private readonly projectCreationService: ProjectCreationService,
  ) {}
  @Post()
  @Public()
  async create(
    @CurrentUserId() userId: string,
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectDto | null> {
    if (createProjectDto.tasks)
      return await this.projectCreationService.createProjectWithTasks(
        createProjectDto,
        userId,
      );
    const project = await this.projectService.create(createProjectDto, userId);
    return plainToInstance(ProjectDto, project, {
      excludeExtraneousValues: true,
    });
  }
  @Get()
  async getAll(@CurrentUserId() userId: string): Promise<ProjectDto[]> {
    const projects = await this.projectService.getAllUserProjects(userId);
    return plainToInstance(ProjectDto, projects, {
      excludeExtraneousValues: true,
    });
  }
}

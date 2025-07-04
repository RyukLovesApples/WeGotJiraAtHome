import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dtos/create-project.dto';
import { CurrentUserId } from 'src/users/decorators/current-user-id.decorator';
import { ProjectCreationService } from './projects-creation.service';
import { plainToInstance } from 'class-transformer';
import { ProjectDto } from './dtos/project.dto';
import { transformToDto } from 'src/utils/transform';
import { Project } from './project.entity';
import { UpdateProjectWithTasks } from './dtos/update-project.dto';
import { Resources } from 'src/project-permissions/decorators/resource.decorator';
import { Resource } from 'src/project-permissions/enums/resource.enum';
import { SkipResourceGuard } from 'src/project-permissions/decorators/skip-resource.decorator';

@Controller()
@Resources(Resource.PROJECT)
@UseInterceptors(ClassSerializerInterceptor)
export class ProjectsController {
  constructor(
    private readonly projectService: ProjectsService,
    private readonly projectCreationService: ProjectCreationService,
  ) {}
  @Post()
  @SkipResourceGuard()
  async create(
    @CurrentUserId() userId: string,
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectDto | null> {
    if (createProjectDto.tasks) {
      const projectWithTasks =
        await this.projectCreationService.createProjectWithTasks(
          createProjectDto,
          userId,
        );
      return transformToDto(ProjectDto, projectWithTasks);
    }
    const project = await this.projectCreationService.create(
      createProjectDto,
      userId,
    );
    return transformToDto(ProjectDto, project);
  }
  @Get()
  @SkipResourceGuard()
  async getAll(@CurrentUserId() userId: string): Promise<ProjectDto[]> {
    const projects = await this.projectService.getAllUserProjects(userId);
    return plainToInstance(ProjectDto, projects, {
      excludeExtraneousValues: true,
    });
  }
  @Get('/:projectId')
  async getOne(
    @CurrentUserId() userId: string,
    @Param('projectId') projectId: string,
  ): Promise<ProjectDto | null> {
    const project = await this.findOneOrFail(projectId);
    return transformToDto(ProjectDto, project);
  }
  @Patch('/:projectId')
  async update(
    @CurrentUserId() userId: string,
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectWithTasks,
  ) {
    const project = await this.findOneOrFail(projectId);
    if (updateProjectDto.tasks) {
      const updateProjectTasks =
        await this.projectCreationService.updateProjectWithTasks(
          project,
          updateProjectDto,
        );
      return transformToDto(ProjectDto, updateProjectTasks);
    }
    const updatedProject = await this.projectService.update(
      project,
      updateProjectDto,
    );
    return transformToDto(ProjectDto, updatedProject);
  }
  @Delete('/:projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUserId() userId: string,
    @Param('projectId') projectId: string,
  ) {
    const project = await this.findOneOrFail(projectId);
    await this.projectService.delete(project);
  }
  private async findOneOrFail(id: string): Promise<Project> {
    const project = await this.projectService.getOneById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }
  // private checkOwnership(project: Project, userId: string) {
  //   if (project.user.id !== userId) {
  //     throw new ForbiddenException(
  //       'Access to project denied. You are not the owner or a user of this project!',
  //     );
  //   }
  // }
}

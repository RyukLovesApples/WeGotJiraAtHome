import { Body, Controller, Post } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dtos/create-project.dto';
import { Public } from 'src/users/decorators/public.decorator';
import { CurrentUserId } from 'src/users/decorators/current-user-id.decorator';
import { ProjectCreationService } from './projects-creation.service';

@Controller('projects')
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
  ) {
    if (createProjectDto.tasks)
      return await this.projectCreationService.createProjectWithTasks(
        createProjectDto,
        userId,
      );
    return await this.projectService.create(createProjectDto, userId);
  }
}

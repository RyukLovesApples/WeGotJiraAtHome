import { Injectable } from '@nestjs/common';
import { TasksService } from 'src/tasks/tasks.service';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dtos/create-project.dto';

@Injectable()
export class ProjectCreationService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
  ) {}

  async createProjectWithTasks(
    createProjectDto: CreateProjectDto,
    userId: string,
  ) {
    const project = await this.projectsService.create(createProjectDto, userId);
    await Promise.all(
      createProjectDto.tasks!.map((task) =>
        this.tasksService.create({ ...task, project }, userId),
      ),
    );
    return await this.projectsService.getOneById(project.id);
  }
}

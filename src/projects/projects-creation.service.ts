import { Injectable } from '@nestjs/common';
import { TasksService } from 'src/tasks/tasks.service';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dtos/create-project.dto';
import { UpdateProjectWithTasks } from './dtos/update-project.dto';
import { Project } from './project.entity';
import { ProjectUsersService } from 'src/project-users/project-users.service';
import { ProjectRole } from 'src/project-users/project-role.enum';

@Injectable()
export class ProjectCreationService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
    private readonly projectUserService: ProjectUsersService,
  ) {}

  async createProjectWithTasks(
    createProjectDto: CreateProjectDto,
    userId: string,
  ) {
    const project = await this.projectsService.create(createProjectDto, userId);
    await Promise.all(
      createProjectDto.tasks!.map((task) =>
        this.tasksService.create({ ...task }, userId, project.id),
      ),
    );
    await this.projectUserService.create({
      projectId: project.id,
      userId,
      role: ProjectRole.OWNER,
    });
    return await this.projectsService.getOneById(project.id);
  }

  async updateProjectWithTasks(
    project: Project,
    updateProject: UpdateProjectWithTasks,
  ): Promise<Project> {
    const tasksToUpdate = updateProject.tasks!;
    console.log(tasksToUpdate);
    for (const taskToUpdate of tasksToUpdate) {
      await this.tasksService.updateTaskById(taskToUpdate);
    }
    return this.projectsService.update(project, updateProject);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { TasksService } from 'src/tasks/tasks.service';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dtos/create-project.dto';
import { Project } from './project.entity';
import { ProjectUsersService } from 'src/project-users/project-users.service';
import { ProjectRole } from 'src/project-users/project-role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/users.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProjectCreationService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
    private readonly projectUserService: ProjectUsersService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<Project> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException();
    }
    const newProject = this.projectRepo.create({
      ...createProjectDto,
      user: user,
    });
    const project = await this.projectRepo.save(newProject);
    await this.projectUserService.create(
      {
        userId,
        role: ProjectRole.OWNER,
      },
      project.id,
    );
    return project;
  }

  // async createProjectWithTasks(
  //   createProjectDto: CreateProjectDto,
  //   userId: string,
  // ) {
  //   const project = await this.create(createProjectDto, userId);
  //   await Promise.all(
  //     createProjectDto.tasks!.map((task) =>
  //       this.tasksService.create({ ...task }, userId, project.id),
  //     ),
  //   );
  //   return await this.projectsService.getOneById(project.id);
  // }

  // async updateProjectWithTasks(
  //   project: Project,
  //   updateProject: UpdateProjectWithTasks,
  // ): Promise<Project> {
  //   const tasksToUpdate = updateProject.tasks!;
  //   for (const taskToUpdate of tasksToUpdate) {
  //     await this.tasksService.updateTaskById(taskToUpdate);
  //   }
  //   return this.projectsService.update(project, updateProject);
  // }
}

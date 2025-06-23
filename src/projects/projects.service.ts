import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { User } from 'src/users/users.entity';
import { UpdateProjectDto } from './dtos/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getOneById(projectId: string): Promise<Project | null> {
    if (!projectId) throw new BadRequestException('Project ID is not defined');
    return await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['tasks', 'user'],
    });
  }

  async getAllUserProjects(userId: string): Promise<Project[]> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User with id ${userId} not found!`);
    const projects = await this.projectRepo.findBy({ user: { id: userId } });
    return projects;
  }

  async update(
    project: Project,
    updateProject: UpdateProjectDto,
  ): Promise<Project> {
    Object.assign(project, updateProject);
    return await this.projectRepo.save(project);
  }

  async delete(project: Project): Promise<void> {
    await this.projectRepo.delete(project.id);
  }
}

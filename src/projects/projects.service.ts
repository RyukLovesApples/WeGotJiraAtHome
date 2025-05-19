import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto } from './dtos/create-project.dto';
import { User } from 'src/users/users.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async create(project: CreateProjectDto, userId: string): Promise<Project> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException();
    }
    const newProject = this.projectRepo.create({
      ...project,
      user: user,
    });
    return await this.projectRepo.save(newProject);
  }

  async getOneById(projectId: string): Promise<Project | null> {
    if (!projectId) throw new BadRequestException('Project ID is not defined');
    return await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['tasks', 'user'],
    });
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectUser } from './project-user.entity';
import { Repository } from 'typeorm';
import { CreateProjectUserInput } from './dtos/create-project-user.dto';
import { UpdateProjectUserRoleInput } from './dtos/update-project-user.input';

@Injectable()
export class ProjectUsersService {
  constructor(
    @InjectRepository(ProjectUser)
    private readonly projectUserRepo: Repository<ProjectUser>,
  ) {}
  public async create(
    input: CreateProjectUserInput,
    projectId: string,
  ): Promise<ProjectUser> {
    const { userId } = input;
    const existing = await this.projectUserRepo.findOneBy({
      projectId,
      userId,
    });
    if (existing) {
      throw new ConflictException('User is already part of this project');
    }
    const projectUser = this.projectUserRepo.create({ ...input, projectId });
    return this.projectUserRepo.save(projectUser);
  }
  public async getAllProjectUsers(projectId: string): Promise<ProjectUser[]> {
    const projectUsers = await this.projectUserRepo.find({
      where: { projectId },
      relations: ['user'],
    });
    return projectUsers;
  }
  public async getOneProjectUser(
    userId: string,
    projectId: string,
  ): Promise<ProjectUser> {
    const projectUser = await this.projectUserRepo.findOne({
      where: { userId, projectId },
      relations: ['user', 'project'],
    });
    if (!projectUser) {
      throw new NotFoundException('ProjectUser not found.');
    }
    return projectUser;
  }
  public async updateProjectUserRole(
    input: UpdateProjectUserRoleInput,
    projectId: string,
  ): Promise<ProjectUser> {
    const { userId, role } = input;
    const projectUser = await this.getOneProjectUser(userId, projectId);
    projectUser.role = role;
    return this.projectUserRepo.save(projectUser);
  }
  public async deleteProjectUser(
    userId: string,
    projectId: string,
  ): Promise<void> {
    const projectUser = await this.getOneProjectUser(userId, projectId);
    await this.projectUserRepo.remove(projectUser);
  }
}

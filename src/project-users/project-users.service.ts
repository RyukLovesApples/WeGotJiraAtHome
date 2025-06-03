import { Injectable } from '@nestjs/common';
import { ProjectRole } from './project-role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectUser } from './project-user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProjectUsersService {
  constructor(
    @InjectRepository(ProjectUser)
    private readonly projectUserRepo: Repository<ProjectUser>,
  ) {}
  public async create(userId: string, projectId: string, role: ProjectRole) {
    const projectUser = this.projectUserRepo.create({
      userId,
      projectId,
      role,
    });
    return await this.projectUserRepo.save(projectUser);
  }
}

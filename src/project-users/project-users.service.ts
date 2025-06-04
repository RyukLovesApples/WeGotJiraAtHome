import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectUser } from './project-user.entity';
import { Repository } from 'typeorm';
import { CreateProjectUserInput } from './dtos/create-project-user.dto';

@Injectable()
export class ProjectUsersService {
  constructor(
    @InjectRepository(ProjectUser)
    private readonly projectUserRepo: Repository<ProjectUser>,
  ) {}
  public async create(input: CreateProjectUserInput) {
    const { projectId, userId } = input;
    const existing = await this.projectUserRepo.findOneBy({
      projectId,
      userId,
    });
    if (existing) {
      throw new ConflictException('User is already part of this project');
    }
    const projectUser = this.projectUserRepo.create(input);
    return await this.projectUserRepo.save(projectUser);
  }
}

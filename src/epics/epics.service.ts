import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Epic } from './epics.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateEpicDto } from './dtos/create-epic.dto';
import { UpdateEpicDto } from './dtos/update-epic.dto';
import { Project } from 'src/projects/project.entity';

@Injectable()
export class EpicService {
  constructor(
    @InjectRepository(Epic)
    private readonly epicRepo: Repository<Epic>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}
  async getAllEpics(projectId: string): Promise<Epic[]> {
    return this.epicRepo.find({
      where: { projectId: projectId },
    });
  }

  async getOneEpic(projectId: string, epicId: string): Promise<Epic> {
    const epic = await this.epicRepo.findOne({
      where: { id: epicId, projectId },
      relations: ['tasks'],
    });
    if (!epic) {
      throw new NotFoundException(`Epic with id ${epicId} not found.`);
    }
    return epic;
  }

  async createEpic(
    userId: string,
    projectId: string,
    createEpicDto: CreateEpicDto,
  ): Promise<Epic> {
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }
    const epicToSave = this.epicRepo.create({
      ...createEpicDto,
      projectId,
      createdById: userId,
    });
    const epic = await this.epicRepo.save(epicToSave);
    return epic;
  }

  async updateEpic(
    updateEpicDto: UpdateEpicDto,
    projectId: string,
    epicId: string,
  ): Promise<Epic> {
    const epic = await this.epicRepo.findOneBy({ id: epicId, projectId });
    if (!epic) {
      throw new NotFoundException(`Epic with id ${epicId} not found.`);
    }
    if (epic.archived && updateEpicDto.archived !== false) {
      throw new BadRequestException('Cannot modify an archived epic.');
    }
    const epicToSave = Object.assign(epic, updateEpicDto) as Epic;
    const updatedEpic = await this.epicRepo.save(epicToSave);
    return updatedEpic;
  }

  async deleteEpic(projectId: string, epicId: string): Promise<void> {
    const epic = await this.epicRepo.findOneBy({ id: epicId, projectId });
    if (epic?.archived)
      throw new BadRequestException('Cannot delete an archived epic.');

    const res = await this.epicRepo.delete({ id: epicId, projectId });
    if (res.affected === 0) {
      throw new NotFoundException(
        `Epic with id ${epicId} not found in project ${projectId}.`,
      );
    }
  }
}

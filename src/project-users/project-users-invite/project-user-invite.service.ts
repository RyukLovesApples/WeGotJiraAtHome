import { Injectable } from '@nestjs/common';
import { CreateProjectInvitaionDto } from './dtos/create-project-user-invite.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectUserInvite } from './project-user-invite.entity';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

@Injectable()
export class ProjectUserInviteService {
  constructor(
    @InjectRepository(ProjectUserInvite)
    private readonly projectUserInviteRepo: Repository<ProjectUserInvite>,
  ) {}
  async createInvite(
    userInvitaion: CreateProjectInvitaionDto,
    invitedById: string,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const projectUserInvite = this.projectUserInviteRepo.create({
      ...userInvitaion,
      invitedById,
      token: randomUUID(),
      expiresAt,
    });
    await this.projectUserInviteRepo.save(projectUserInvite);
  }
  isExpired(expiredAt: Date): boolean {
    const currentDate = new Date(Date.now());
    if (currentDate > expiredAt) {
      return true;
    }
    return false;
  }
  // for intervall deletion of expired invites
  async deleteExpiredInvites() {
    await this.projectUserInviteRepo
      .createQueryBuilder()
      .delete()
      .from(ProjectUserInvite)
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }
}

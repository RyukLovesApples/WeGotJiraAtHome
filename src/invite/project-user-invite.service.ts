import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { CreateProjectInvitaionDto } from './dtos/create-project-user-invite.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectUserInvite } from './project-user-invite.entity';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { MailerService } from 'src/mailer/mailer.service';
import { inviteEmailTemplate } from 'src/mailer/templates/invitation.template';
import { ProjectsService } from 'src/projects/projects.service';

@Injectable()
export class ProjectUserInviteService implements OnModuleInit {
  constructor(
    private readonly mailerService: MailerService,
    private readonly projectService: ProjectsService,
    @InjectRepository(ProjectUserInvite)
    private readonly projectUserInviteRepo: Repository<ProjectUserInvite>,
  ) {}
  async createInvite(
    userInvitaion: CreateProjectInvitaionDto,
    invitedById: string,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const token = randomUUID();
    const projectUserInvite = this.projectUserInviteRepo.create({
      ...userInvitaion,
      invitedById,
      token,
      expiresAt,
    });
    await this.projectUserInviteRepo.save(projectUserInvite);
    const project = await this.projectService.getOneById(
      userInvitaion.projectId,
    );
    if (!project) {
      throw new NotFoundException(
        `Could not find project with id: ${userInvitaion.projectId}`,
      );
    }
    const inviteLink = `https://WeGotJiraAtHome.com/invite?token=${token}`;
    await this.mailerService.sendEmail({
      to: userInvitaion.email,
      subject: 'You’ve been invited to join a project',
      html: inviteEmailTemplate(inviteLink, project.name),
    });
  }
  isExpired(expiredAt: Date): boolean {
    const currentDate = new Date(Date.now());
    if (currentDate > expiredAt) {
      return true;
    }
    return false;
  }
  async deleteExpiredInvites(): Promise<void> {
    await this.projectUserInviteRepo
      .createQueryBuilder()
      .delete()
      .from(ProjectUserInvite)
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }
  async getInviteByToken(token: string): Promise<ProjectUserInvite> {
    const invite = await this.projectUserInviteRepo.findOne({
      where: { token },
    });
    if (!invite) {
      throw new NotFoundException('Could not find the invitation');
    }
    return invite;
  }
  onModuleInit() {
    setInterval(
      () => {
        this.deleteExpiredInvites().catch((err) =>
          console.error('Failed to delete expired invites:', err),
        );
      },
      1000 * 60 * 60 * 24,
    );
  }
}

import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EmailVerification } from './email-verification.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MailerService } from '../mailer/mailer.service';
import { emailVerificationTemplate } from '../mailer/templates/email-verification.template';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly mailerService: MailerService,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepo: Repository<EmailVerification>,
  ) {}
  async createEmailVerification(userId: string): Promise<void> {
    const user = await this.userService.findOne(userId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const emailVerification = this.emailVerificationRepo.create({
      expiresAt,
      userId,
    });
    const { id } = await this.emailVerificationRepo.save(emailVerification);
    const verificationLink = `https://WeGotJiraAtHome.com/verify-email?token=${id}`;
    await this.mailerService.sendEmail({
      to: user.email,
      subject: 'Email verification; WeGotJiraAtHome',
      html: emailVerificationTemplate(verificationLink, user.username),
    });
  }
  async deleteEmailVerificationById(token: string): Promise<void> {
    await this.emailVerificationRepo.delete({ id: token });
  }

  async deleteExpiredEmailVerification(): Promise<void> {
    await this.emailVerificationRepo
      .createQueryBuilder()
      .delete()
      .from(EmailVerification)
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }
  async getEmailVerificationByToken(
    token: string,
  ): Promise<EmailVerification | null> {
    const emailVerification = await this.emailVerificationRepo.findOne({
      where: { id: token },
    });
    return emailVerification;
  }

  isExpired(expiration: Date): boolean {
    return new Date() > expiration;
  }
}

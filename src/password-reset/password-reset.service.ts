import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersService } from '../users/users.service';
import { PasswordReset } from './password-reset.entity';
import { Repository } from 'typeorm';
import { MailerService } from '../mailer/mailer.service';
import { passwordResetTemplate } from '../mailer/templates/password-reset.template';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepo: Repository<PasswordReset>,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly mailerService: MailerService,
  ) {}
  async createPasswordReset(userId: string): Promise<void> {
    const user = await this.userService.findOne(userId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const passwordReset = this.passwordResetRepo.create({
      expiresAt,
      userId,
    });
    const { id } = await this.passwordResetRepo.save(passwordReset);
    const passwordResetLink = `https://WeGotJiraAtHome.com/password-reset?token=${id}`;
    await this.mailerService.sendEmail({
      to: user.email,
      subject: 'Password reset; WeGotJiraAtHome',
      html: passwordResetTemplate(passwordResetLink, user.username),
    });
  }
  async deletePasswordReset(token: string): Promise<boolean> {
    await this.passwordResetRepo.delete(token);
    return true;
  }
  async deleteExpiredPasswordReset(): Promise<void> {
    await this.passwordResetRepo
      .createQueryBuilder()
      .delete()
      .from(PasswordReset)
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }
  async getPasswordResetById(token: string): Promise<PasswordReset | null> {
    const passwordReset = await this.passwordResetRepo.findOneBy({ id: token });
    return passwordReset;
  }
  isExpired(expiration: Date): boolean {
    return new Date() > expiration;
  }
}

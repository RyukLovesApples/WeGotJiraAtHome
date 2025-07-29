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
  async createPasswordReset(email: string): Promise<void> {
    const user = await this.userService.findOneByEmail(email);
    if (!user) {
      return;
    }
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const passwordReset = this.passwordResetRepo.create({
      expiresAt,
      userId: user.id,
    });
    const { id } = await this.passwordResetRepo.save(passwordReset);
    const passwordResetLink = `https://WeGotJiraAtHome.com/password-reset?token=${id}`;
    await this.mailerService.sendEmail({
      to: email,
      subject: 'Password reset; WeGotJiraAtHome',
      html: passwordResetTemplate(passwordResetLink, user.username),
    });
  }
  async deletePasswordResetById(token: string): Promise<void> {
    await this.passwordResetRepo.delete(token);
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
  async onConfirm(id: string): Promise<void> {
    await this.passwordResetRepo.update(id, { confirmed: true });
  }
  async markAsUsed(id: string): Promise<void> {
    await this.passwordResetRepo.update(id, { used: true });
  }
}

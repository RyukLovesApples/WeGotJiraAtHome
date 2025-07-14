import { Module } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { EmailVerificationController } from './email-verification.controller';
import { MailerModule } from 'src/mailer/mailer.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [MailerModule, UsersModule],
  providers: [EmailVerificationService],
  controllers: [EmailVerificationController],
})
export class EmailVerificationModule {}

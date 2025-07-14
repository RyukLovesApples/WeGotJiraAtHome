import { Module } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { EmailVerificationController } from './email-verification.controller';
import { MailerModule } from 'src/mailer/mailer.module';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailVerification } from './email-verification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerification]),
    MailerModule,
    UsersModule,
  ],
  providers: [EmailVerificationService],
  controllers: [EmailVerificationController],
})
export class EmailVerificationModule {}

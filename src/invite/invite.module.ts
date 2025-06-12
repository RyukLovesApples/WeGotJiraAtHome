import { Module } from '@nestjs/common';
import { InviteController } from './invite.controller';
import { ProjectUserInviteService } from './project-user-invite.service';
import { MailerService } from 'src/mailer/mailer.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectUserInvite } from './project-user-invite.entity';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectUserInvite]), MailerModule],
  controllers: [InviteController],
  providers: [ProjectUserInviteService, MailerService],
})
export class InviteModule {}

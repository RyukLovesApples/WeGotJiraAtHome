import { Module } from '@nestjs/common';
import { InviteController } from './invite.controller';
import { ProjectUserInviteService } from './project-user-invite.service';
import { MailerService } from 'src/mailer/mailer.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectUserInvite } from './project-user-invite.entity';
import { MailerModule } from 'src/mailer/mailer.module';
import { ProjectsModule } from 'src/projects/projects.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectUserInvite]),
    MailerModule,
    ProjectsModule,
    UsersModule,
  ],
  controllers: [InviteController],
  providers: [ProjectUserInviteService, MailerService],
  exports: [ProjectUserInviteService],
})
export class InviteModule {}

import { Module } from '@nestjs/common';
import { ProjectUsersService } from './project-users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectUser } from 'src/project-users/project-user.entity';
import { ProjectUsersResolver } from './project-users.resolver';
import { InviteModule } from 'src/invite/invite.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectUser]), InviteModule],
  providers: [ProjectUsersService, ProjectUsersResolver],
})
export class ProjectUsersModule {}

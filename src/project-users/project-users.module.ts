import { Module } from '@nestjs/common';
import { ProjectUsersService } from './project-users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectUser } from 'src/project-users/project-user.entity';
import { ProjectUsersResolver } from './project-users.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectUser])],
  providers: [ProjectUsersService, ProjectUsersResolver],
})
export class ProjectUsersModule {}

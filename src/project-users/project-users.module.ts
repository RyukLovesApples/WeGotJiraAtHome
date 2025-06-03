import { Module } from '@nestjs/common';
import { ProjectUsersService } from './project-users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectUser } from 'src/project-users/project-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectUser])],
  providers: [ProjectUsersService],
})
export class ProjectUsersModule {}

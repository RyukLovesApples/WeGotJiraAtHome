import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { ProjectUser } from '../project-users/project-user.entity';
import { User } from 'src/users/users.entity';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectCreationService } from './projects-creation.service';
import { Task } from 'src/tasks/task.entity';
import { TasksModule } from 'src/tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectUser, User, Task]),
    TasksModule,
  ],
  providers: [ProjectsService, ProjectCreationService],
  controllers: [ProjectsController],
})
export class ProjectsModule {}

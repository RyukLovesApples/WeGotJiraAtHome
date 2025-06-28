import { Module } from '@nestjs/common';
import { PermissionsService } from './project-permissions.service';
import { ProjectUsersModule } from 'src/project-users/project-users.module';
import { ProjectsModule } from 'src/projects/projects.module';
import { ProjectPermissionsController } from './project-permissions.controller';

@Module({
  imports: [ProjectUsersModule, ProjectsModule],
  providers: [PermissionsService],
  exports: [PermissionsService],
  controllers: [ProjectPermissionsController],
})
export class PermissionsModule {}

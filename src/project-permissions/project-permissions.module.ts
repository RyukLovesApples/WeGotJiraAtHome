import { Module } from '@nestjs/common';
import { ProjectPermissionsService } from './project-permissions.service';
import { ProjectUsersModule } from 'src/project-users/project-users.module';
import { ProjectsModule } from 'src/projects/projects.module';
import { ProjectPermissionsController } from './project-permissions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectPermission } from './project-permissions.entity';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectPermission]),
    ProjectUsersModule,
    ProjectsModule,
    CacheModule.register(),
  ],
  providers: [ProjectPermissionsService],
  exports: [ProjectPermissionsService],
  controllers: [ProjectPermissionsController],
})
export class PermissionsModule {}

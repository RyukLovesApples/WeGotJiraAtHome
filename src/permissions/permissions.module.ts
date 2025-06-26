import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { ProjectUsersModule } from 'src/project-users/project-users.module';
// import { ResourcePermissionGuard } from './guards/resource-permissions.guard';
// import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [ProjectUsersModule],
  providers: [
    PermissionsService,
    // {
    //   provide: APP_GUARD,
    //   useClass: ResourcePermissionGuard,
    // },
  ],
  exports: [PermissionsService],
})
export class PermissionsModule {}

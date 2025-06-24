import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { ProjectUsersModule } from 'src/project-users/project-users.module';

@Module({
  imports: [ProjectUsersModule],
  providers: [PermissionsService],
})
export class PermissionsModule {}

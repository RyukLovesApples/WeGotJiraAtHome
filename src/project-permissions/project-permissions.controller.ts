import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { CreateProjectPermissionDto } from './dtos/create-project-permission.dto';
import { CurrentUserId } from 'src/users/decorators/current-user-id.decorator';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Controller('project-permissions')
export class ProjectPermissionsController {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
  // @Post()
  // async createProjectPermissions(
  //   @CurrentUserId() _: string,
  //   @Param('projectId') projectId: string,
  //   @Body() createProjectPermissionsDto: CreateProjectPermissionDto,
  // ) {

  // }
}

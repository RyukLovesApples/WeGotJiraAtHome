import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { CreateProjectPermissionDto } from './dtos/create-project-permission.dto';
import { CurrentUserId } from 'src/users/decorators/current-user-id.decorator';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ProjectPermissionsService } from './project-permissions.service';

@Controller('project-permissions')
export class ProjectPermissionsController {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly projectPermissionsService: ProjectPermissionsService,
  ) {}
  @Post()
  async createOrUpdateProjectPermissions(
    @CurrentUserId() _: string,
    @Param('projectId') projectId: string,
    @Body() createProjectPermissionsDto: CreateProjectPermissionDto[],
  ): Promise<void> {
    await this.projectPermissionsService.upsertProjectPermissions(
      projectId,
      createProjectPermissionsDto,
    );
  }
}

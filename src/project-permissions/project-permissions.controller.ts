import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  Param,
  ParseArrayPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateProjectPermissionDto } from './dtos/create-project-permission.dto';
import { CurrentUserId } from 'src/users/decorators/current-user-id.decorator';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ProjectPermissionsService } from './project-permissions.service';
import { ProjectPermissionMapDto } from './dtos/project-permission-map.dto';
import { defaultProjectPermissions } from 'src/config/project-permissions.config';
import { Resources } from './decorators/resource.decorator';
import { Resource } from './enums/resource.enum';
import { ProjectRole } from 'src/project-users/project-role.enum';

@Controller()
@Resources(Resource.PROJECT_PERMISSIONS)
export class ProjectPermissionsController {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly projectPermissionsService: ProjectPermissionsService,
  ) {}
  @Post()
  async createOrUpdateProjectPermissions(
    @CurrentUserId() _: string,
    @Param('projectId') projectId: string,
    @Body(new ParseArrayPipe({ items: CreateProjectPermissionDto }))
    createProjectPermissionsDto: CreateProjectPermissionDto[],
  ): Promise<void> {
    if (
      createProjectPermissionsDto.some((dto) => dto.role === ProjectRole.OWNER)
    ) {
      throw new ForbiddenException("Can't change permissions for OWNER role");
    }
    const permissions =
      await this.projectPermissionsService.upsertProjectPermissions(
        projectId,
        createProjectPermissionsDto,
      );
    await this.cacheManager.set(
      `project-permissions:${projectId}`,
      permissions,
    );
  }
  @Patch()
  async updateRolePermission(
    @CurrentUserId() _: string,
    @Param('projectId') projectId: string,
    updateRolePermission: CreateProjectPermissionDto,
  ): Promise<void> {
    if (updateRolePermission.role === ProjectRole.OWNER) {
      throw new ForbiddenException("Can't change permissions for OWNER role");
    }
    const permissions =
      await this.projectPermissionsService.updateRolePermission(
        projectId,
        updateRolePermission,
      );
    await this.cacheManager.set(
      `project-permissions:${projectId}`,
      permissions,
    );
  }
  // GET must always be triggered by frontend on any change!
  @Get()
  async getProjectPermissions(
    @CurrentUserId() _: string,
    @Param('projectId') projectId: string,
  ): Promise<ProjectPermissionMapDto> {
    const cachedPermissions = await this.cacheManager.get(
      `project-permissions:${projectId}`,
    );
    if (cachedPermissions) return cachedPermissions;
    const permissions =
      await this.projectPermissionsService.getProjectPermissions(projectId);
    await this.cacheManager.set(
      `project-permissions:${projectId}`,
      permissions,
    );
    return permissions;
  }
  @Delete()
  async resetToDefaultProjectPermissions(
    @Param('projectId') projectId: string,
  ): Promise<void> {
    await this.projectPermissionsService.resetToDefaultProjectPermissions(
      projectId,
    );
    await this.cacheManager.set(
      `project-permissions:${projectId}`,
      defaultProjectPermissions,
    );
  }
}

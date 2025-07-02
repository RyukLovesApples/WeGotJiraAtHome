import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Resource } from './enums/resource.enum';
import { ProjectUsersService } from 'src/project-users/project-users.service';
import { defaultProjectPermissions } from 'src/config/project-permissions.config';
import { mapPermissionAction } from './utils/map-permissions-action';
import { ProjectUser } from 'src/project-users/project-user.entity';
import { CreateProjectPermissionDto } from './dtos/create-project-permission.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectPermission } from './project-permissions.entity';
import { Repository } from 'typeorm';
import { ProjectsService } from 'src/projects/projects.service';
import { mapPermissionsToRole } from './utils/map-permission-to-role';
import { normalizeAllPermissions } from './utils/normalize-all-permissions';
import { transformToDto } from 'src/utils/transform';
import { ProjectPermissionMapDto } from './dtos/project-permission-map.dto';

@Injectable()
export class ProjectPermissionsService {
  constructor(
    private readonly projectUsersService: ProjectUsersService,
    @InjectRepository(ProjectPermission)
    private readonly projectPermissionRepo: Repository<ProjectPermission>,
    private readonly projectsService: ProjectsService,
  ) {}
  async checkProjectPermission(
    userId: string,
    projectId: string | undefined,
    method: string,
    resource: Resource,
  ): Promise<boolean> {
    let projectUser: ProjectUser;
    if (!projectId) return false;
    try {
      projectUser = await this.projectUsersService.getOneProjectUser(
        userId,
        projectId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException('User is not part of project.');
      }
      return false;
    }
    const projectRole = projectUser.role;
    const action = mapPermissionAction(method);
    if (!action) return false;
    return Boolean(
      defaultProjectPermissions?.[projectRole]?.[resource]?.[action],
    );
  }
  async upsertProjectPermissions(
    projectId: string,
    createProjectPermissions: CreateProjectPermissionDto[],
  ): Promise<ProjectPermissionMapDto> {
    const project = await this.projectsService.getOneById(projectId);
    if (!project) {
      throw new NotFoundException(
        `Project with ID: ${projectId} does not exist`,
      );
    }
    const existing = await this.projectPermissionRepo.find({
      where: { projectId },
    });
    const permissions = createProjectPermissions.map((permission) =>
      this.projectPermissionRepo.create({
        role: permission.role,
        projectId,
        permissions: { ...permission.permissions },
      }),
    );

    if (existing.length === 0) {
      return this.createProjectPermissions(permissions);
    } else {
      return this.updateProjectPermissions(permissions, existing);
    }
  }
  async createProjectPermissions(
    permissions: CreateProjectPermissionDto[],
  ): Promise<ProjectPermissionMapDto> {
    const createdPermissions = await Promise.all(
      permissions.map((permission) =>
        this.projectPermissionRepo.save(permission),
      ),
    );
    const createdAndMappedPermissions =
      mapPermissionsToRole(createdPermissions);
    const normalizedPermissions = normalizeAllPermissions(
      defaultProjectPermissions,
      createdAndMappedPermissions,
    );
    return transformToDto(ProjectPermissionMapDto, normalizedPermissions);
  }
  async updateProjectPermissions(
    updatedPermissions: ProjectPermission[],
    existingPermissions: ProjectPermission[],
  ): Promise<ProjectPermissionMapDto> {
    const permissionMap = new Map(
      existingPermissions.map((permission) => [permission.role, permission]),
    );

    const updates = updatedPermissions.map((permission) => {
      const existing = permissionMap.get(permission.role);
      if (!existing) return;
      Object.assign(existing, permission);
      return this.projectPermissionRepo.save(existing);
    });
    const updatedPermissionsArray = await Promise.all(
      updates.filter((permission): permission is Promise<ProjectPermission> =>
        Boolean(permission),
      ),
    );
    const updatedAndMappedPermissions = mapPermissionsToRole(
      updatedPermissionsArray,
    );
    const normalizedPermissions = normalizeAllPermissions(
      defaultProjectPermissions,
      updatedAndMappedPermissions,
    );
    return transformToDto(ProjectPermissionMapDto, normalizedPermissions);
  }
  async updateRolePermission(
    projectId: string,
    createRolePermission: CreateProjectPermissionDto,
  ): Promise<ProjectPermissionMapDto> {
    const project = await this.projectsService.getOneById(projectId);
    if (!project) {
      throw new NotFoundException(
        `Project with ID: ${projectId} does not exist`,
      );
    }
    const projectPermission = await this.projectPermissionRepo.findOne({
      where: { projectId, role: createRolePermission.role },
    });
    if (!projectPermission) {
      throw new NotFoundException(
        `Project role with projectId: ${projectId} not found.`,
      );
    }
    projectPermission.permissions = { ...createRolePermission.permissions };
    const updatedPermission =
      await this.projectPermissionRepo.save(projectPermission);
    const updatedAndMappedPermission = mapPermissionsToRole([
      updatedPermission,
    ]);
    const normalizedPermissions = normalizeAllPermissions(
      defaultProjectPermissions,
      updatedAndMappedPermission,
    );
    return transformToDto(ProjectPermissionMapDto, normalizedPermissions);
  }
  async getProjectPermissions(projectId: string) {
    const projectPermissions = await this.projectPermissionRepo.findBy({
      projectId,
    });
    if (projectPermissions.length === 0) {
      return defaultProjectPermissions;
    }
    const mappedPermisisons = mapPermissionsToRole(projectPermissions);
    const normalizedPermissions = normalizeAllPermissions(
      defaultProjectPermissions,
      mappedPermisisons,
    );
    return transformToDto(ProjectPermissionMapDto, normalizedPermissions);
  }

  async resetToDefaultProjectPermissions(projectId: string): Promise<void> {
    await this.projectPermissionRepo.delete({ projectId });
  }
}

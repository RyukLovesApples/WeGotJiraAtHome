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
  ): Promise<void> {
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
  ): Promise<void> {
    await Promise.all(
      permissions.map((permission) =>
        this.projectPermissionRepo.save(permission),
      ),
    );
  }
  async updateProjectPermissions(
    updatedPermissions: ProjectPermission[],
    existingPermissions: ProjectPermission[],
  ): Promise<void> {
    const permissionMap = new Map(
      existingPermissions.map((permission) => [permission.role, permission]),
    );

    const updates = updatedPermissions.map((permission) => {
      const existing = permissionMap.get(permission.role);
      if (!existing) return;
      Object.assign(existing, permission);
      return this.projectPermissionRepo.save(existing);
    });
    await Promise.all(updates.filter(Boolean));
  }
  async updateRolePermission(
    projectId: string,
    createRolePermission: CreateProjectPermissionDto,
  ) {
    const project = await this.projectsService.getOneById(projectId);
    if (!project) {
      throw new NotFoundException(
        `Project with ID: ${projectId} does not exist`,
      );
    }
    const projectRole = await this.projectPermissionRepo.findOne({
      where: { projectId, role: createRolePermission.role },
    });
    if (!projectRole) {
      throw new NotFoundException(
        `Project role with projectId: ${projectId} not found.`,
      );
    }
    projectRole.permissions = createRolePermission.permissions;
    await this.projectPermissionRepo.save(projectRole);
  }
}

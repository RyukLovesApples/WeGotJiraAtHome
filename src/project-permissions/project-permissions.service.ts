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

@Injectable()
export class PermissionsService {
  constructor(private readonly projectUsersService: ProjectUsersService) {}
  async checkPermission(
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
}

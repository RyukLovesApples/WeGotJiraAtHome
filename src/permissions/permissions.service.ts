import { Injectable } from '@nestjs/common';
import { ProjectRole } from 'src/project-users/project-role.enum';
import { Resource } from './enums/resource.enum';
import { ProjectUsersService } from 'src/project-users/project-users.service';
import { defaultPermissions } from 'src/config/permissions.config';

@Injectable()
export class PermissionsService {
  constructor(private readonly projectUsersService: ProjectUsersService) {}
  checkPermission(
    projectRole: ProjectRole,
    method: string,
    resource: string,
  ): boolean {
    if (defaultPermissions[projectRole]?[resource][method]) return true;
    return false;
  }
}

import { ProjectPermission } from '../project-permissions.entity';
import { ProjectPermissionMapDto } from '../dtos/project-permission-map.dto';

export function mapPermissionsToRole(
  permissionsArray: Array<ProjectPermission>,
): Partial<ProjectPermissionMapDto> {
  const map: Partial<ProjectPermissionMapDto> = {};

  for (const permission of permissionsArray) {
    map[permission.role] = permission.permissions;
  }

  return map;
}

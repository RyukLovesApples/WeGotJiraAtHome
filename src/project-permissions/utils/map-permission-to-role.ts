import { ProjectRole } from 'src/project-users/project-role.enum';
import { ResourceDto } from '../dtos/resource.dto';
import { ProjectPermission } from '../project-permissions.entity';

export function mapPermissionsToRole(
  permissionsArray: ProjectPermission[],
): Partial<Record<ProjectRole, ResourceDto>> {
  const map: Partial<Record<ProjectRole, ResourceDto>> = {};

  for (const permission of permissionsArray) {
    map[permission.role] = permission.permissions;
  }

  return map;
}

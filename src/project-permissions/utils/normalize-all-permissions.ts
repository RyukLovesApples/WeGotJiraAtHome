import { ProjectRole } from 'src/project-users/project-role.enum';
import { ProjectPermissionMapDto } from '../dtos/project-permission-map.dto';

export function normalizeAllPermissions(
  defaults: ProjectPermissionMapDto,
  stored?: Partial<ProjectPermissionMapDto>,
): ProjectPermissionMapDto {
  const normalized: ProjectPermissionMapDto = { ...defaults };

  if (!stored) return normalized;

  for (const role of Object.keys(stored) as ProjectRole[]) {
    const permissions = stored[role];
    if (permissions) {
      normalized[role] = permissions;
    }
  }
  return normalized;
}

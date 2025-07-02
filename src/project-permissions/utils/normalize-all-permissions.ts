import { ProjectPermissionMapDto } from '../dtos/project-permission-map.dto';
import { normalizeRolePermissionsDeep } from './normalize-role-permissions-deep';

export function normalizeAllPermissions(
  defaults: ProjectPermissionMapDto,
  stored?: Partial<ProjectPermissionMapDto>,
): ProjectPermissionMapDto {
  const normalized: ProjectPermissionMapDto = new ProjectPermissionMapDto();

  for (const role of Object.keys(
    defaults,
  ) as (keyof ProjectPermissionMapDto)[]) {
    const defaultPerms = defaults[role];
    const storedPerms = stored?.[role];

    if (defaultPerms) {
      normalized[role] = normalizeRolePermissionsDeep(
        defaultPerms,
        storedPerms,
      );
    }
  }

  return normalized;
}

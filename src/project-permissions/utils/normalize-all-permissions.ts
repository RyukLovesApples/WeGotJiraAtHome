import { PermissionNode } from '../types/permissions-node.type';
import { normalizeRolePermissionsDeep } from './normalize-role-permissions-deep';

export function normalizeAllPermissions(
  defaults: Record<string, PermissionNode>,
  stored?: Partial<Record<string, Partial<PermissionNode>>>,
): Record<string, PermissionNode> {
  const normalized: Record<string, PermissionNode> = {};
  for (const role in defaults) {
    normalized[role] = normalizeRolePermissionsDeep(
      defaults[role],
      stored?.[role],
    );
  }
  return normalized;
}

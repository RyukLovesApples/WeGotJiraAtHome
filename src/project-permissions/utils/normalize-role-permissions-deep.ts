interface PermissionNode {
  [key: string]: boolean | PermissionNode;
}

export function normalizeRolePermissionsDeep(
  defaultPerms: PermissionNode,
  storedPerms?: Partial<PermissionNode>,
): PermissionNode {
  const normalized: PermissionNode = {};

  for (const key in defaultPerms) {
    const defaultVal = defaultPerms[key];
    const storedVal = storedPerms?.[key];

    if (typeof defaultVal === 'object' && defaultVal !== null) {
      normalized[key] = normalizeRolePermissionsDeep(
        defaultVal,
        typeof storedVal === 'object' && storedVal !== null ? storedVal : {},
      );
    } else {
      normalized[key] = storedVal !== undefined ? storedVal : defaultVal;
    }
  }
  return normalized;
}

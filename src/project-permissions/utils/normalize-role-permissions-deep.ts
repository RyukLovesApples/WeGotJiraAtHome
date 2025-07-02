import { ActionDto } from '../dtos/action.dto';
import { ResourceDto } from '../dtos/resource.dto';

export function normalizeRolePermissionsDeep(
  defaultPerms: ResourceDto,
  storedPerms?: Partial<ResourceDto>,
): ResourceDto {
  const normalized: ResourceDto = new ResourceDto();

  for (const resource of Object.keys(defaultPerms) as (keyof ResourceDto)[]) {
    const defaultActions = defaultPerms[resource];
    const storedActions = storedPerms?.[resource];

    if (defaultActions && typeof defaultActions === 'object') {
      const actionDto = new ActionDto();

      for (const action of Object.keys(defaultActions) as (keyof ActionDto)[]) {
        const defaultValue = defaultActions[action];
        const storedValue = storedActions?.[action];

        actionDto[action] =
          storedValue !== undefined ? storedValue : defaultValue;
      }
      normalized[resource] = actionDto;
    }
  }

  return normalized;
}

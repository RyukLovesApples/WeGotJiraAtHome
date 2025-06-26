import { Action } from '../enums/action.enum';
import { Resource } from '../enums/resource.enum';
import { ProjectRole } from 'src/project-users/project-role.enum';

export type PermissionMap = {
  [role in ProjectRole]: {
    [resource in Resource]?: {
      [action in Action]?: boolean;
    };
  };
};

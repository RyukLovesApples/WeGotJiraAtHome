import { PermissionMap } from 'src/permissions/types/permission-map.type';
import { deepFreeze } from 'src/utils/deepFreeze';

export const defaultPermissions: PermissionMap = deepFreeze({
  OWNER: {
    projects: {
      read: true,
      update: true,
      delete: true,
    },
    tasks: {
      read: true,
      create: true,
      update: true,
      delete: true,
    },
    'project-users': {
      read: true,
      create: true,
      update: true,
      delete: true,
    },
    invite: {
      create: true,
    },
  },
  ADMIN: {
    projects: {
      read: true,
      update: true,
    },
    tasks: {
      read: true,
      create: true,
      update: true,
    },
    'project-users': {
      read: true,
    },
  },
  USER: {
    projects: {
      read: true,
    },
    tasks: {
      read: true,
      create: true,
      // check for ownership of task to enable update and delete
    },
    'project-users': {
      read: true,
    },
  },
  VISITOR: {
    projects: {
      read: true,
    },
    tasks: {
      read: true,
    },
  },
});

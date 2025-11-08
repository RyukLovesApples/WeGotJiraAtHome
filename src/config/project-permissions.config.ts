import { ProjectPermissionMap } from 'src/project-permissions/types/project-permission-map.type';
import { deepFreeze } from 'src/utils/deepFreeze';

export const defaultProjectPermissions: ProjectPermissionMap = deepFreeze({
  OWNER: {
    projects: {
      read: true,
      update: true,
      delete: true,
    },
    epics: {
      read: true,
      create: true,
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
    },
    invite: {
      read: true,
      create: true,
    },
    'project-permissions': {
      read: true,
      create: true,
      update: true,
      delete: true,
    },
  },
  ADMIN: {
    projects: {
      read: true,
      update: true,
    },
    epics: {
      read: true,
      create: true,
      update: true,
      delete: true,
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
    epics: {
      read: true,
    },
    tasks: {
      read: true,
    },
    'project-users': {
      read: true,
    },
  },
  GUEST: {
    projects: {
      read: true,
    },
  },
});

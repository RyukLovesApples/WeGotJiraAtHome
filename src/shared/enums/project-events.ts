export enum ProjectEvents {
  JOIN_PROJECT = 'joinProject',
  USER_JOINED_PROJECT = 'userJoinedProject',

  USER_ONLINE = 'userOnline',
  USER_OFFLINE = 'userOffline',

  PROJECT_UPDATED = 'projectUpdated',
  PROJECT_DELETED = 'projectDeleted',

  EPIC_CREATED = 'epicCreated',
  EPIC_UPDATED = 'epicUpdated',
  EPIC_DELETED = 'epicDeleted',

  TASK_CREATED = 'taskCreated',
  TASK_UPDATED = 'taskUpdated',
  TASK_ASSIGNED = 'taskAssigned',
  TASK_DELETED = 'taskDeleted',

  // Test env
  CONNECTION_READY = 'connection-ready',
}

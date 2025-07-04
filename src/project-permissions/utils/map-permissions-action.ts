import { Action } from '../enums/action.enum';

export const mapPermissionAction = (method: string): Action | undefined => {
  switch (method) {
    case 'GET':
    case 'QUERY':
      return Action.READ;
    case 'POST':
    case 'MUTATION':
      return Action.CREATE;
    case 'PUT':
      return Action.UPDATE;
    case 'PATCH':
      return Action.UPDATE;
    case 'DELETE':
      return Action.DELETE;
  }
};

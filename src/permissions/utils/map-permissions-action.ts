export const mapPermissionAction = (action: string): string => {
  switch (action) {
    case 'GET':
      return 'read';
    case 'POST':
      return 'create';
    case 'PUT':
      return 'update';
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      console.info('Method is not included in permissions list!');
      return '';
  }
};

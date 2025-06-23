import { Injectable } from '@nestjs/common';
import { ProjectRole } from 'src/project-users/project-role.enum';
import { Resource } from './enums/resource.enum';

@Injectable()
export class PermissionsService {
  checkPermission(role: ProjectRole, resource: Resource, method: string) {
    
  }
}

import { ProjectRole } from 'src/project-users/project-role.enum';
import { ResourceDto } from './resource.dto';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class CreateProjectPermissionDto extends ResourceDto {
  @IsNotEmpty()
  @IsEnum(ProjectRole)
  role!: ProjectRole;
}

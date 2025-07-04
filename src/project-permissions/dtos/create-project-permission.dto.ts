import { ProjectRole } from 'src/project-users/project-role.enum';
import { ResourceDto } from './resource.dto';
import { IsEnum, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectPermissionDto {
  @IsNotEmpty()
  @IsEnum(ProjectRole)
  role!: ProjectRole;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ResourceDto)
  permissions!: ResourceDto;
}

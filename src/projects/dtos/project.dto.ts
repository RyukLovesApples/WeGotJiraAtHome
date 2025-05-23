import { Expose, Type } from 'class-transformer';
import { IsUUID } from 'class-validator';
import { UserDto } from 'src/users/dtos/user.dto';
import { ProjectUser } from '../project-user.entity';

export class ProjectDto {
  @Expose()
  @IsUUID()
  id!: string;
  @Expose()
  name!: string;
  @Expose()
  @Type(() => UserDto)
  user!: UserDto;
  @Expose()
  projectUsers!: ProjectUser[];
}

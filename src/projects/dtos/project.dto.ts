import { Expose, Type } from 'class-transformer';
import { IsUUID } from 'class-validator';
import { UserDto } from 'src/users/dtos/user.dto';
import { ProjectUser } from '../project-user.entity';
import { TaskDto } from 'src/tasks/dtos/task.dto';

export class ProjectDto {
  @Expose()
  @IsUUID()
  id!: string;
  @Expose()
  name!: string;
  @Expose()
  description?: string;
  @Expose()
  @Type(() => TaskDto)
  tasks?: TaskDto[];
  @Expose()
  @Type(() => UserDto)
  user!: UserDto;
  @Expose()
  projectUsers!: ProjectUser[];
}

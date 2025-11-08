import { Expose, Type } from 'class-transformer';
import { UserDto } from '../../users/dtos/user.dto';
import { TaskLabel } from '../task-label.entity';

export class TaskDto {
  @Expose()
  id!: string;

  @Expose()
  parentId?: string;

  @Expose()
  title!: string;

  @Expose()
  description!: string;

  @Expose()
  status!: string;

  @Expose()
  labels?: TaskLabel[];

  @Expose()
  assignedToId!: string;

  @Expose()
  @Type(() => TaskDto)
  subtasks?: TaskDto[];

  @Expose()
  layer!: number;

  @Expose()
  epicId!: string;

  @Expose()
  dueDate!: Date;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  projectId!: string;

  @Expose()
  userId!: string;

  @Expose()
  @Type(() => UserDto)
  user!: UserDto;
}

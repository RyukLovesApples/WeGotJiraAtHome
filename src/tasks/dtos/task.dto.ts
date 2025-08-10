import { Expose, Type } from 'class-transformer';
import { UserDto } from '../../users/dtos/user.dto';
import { TaskLabel } from '../task-label.entity';
import { Task } from '../task.entity';

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
  // @Type(() => TaskDto)
  subtasks?: Task[];

  @Expose()
  layer!: number;

  @Expose()
  dueDate!: Date;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  @Type(() => UserDto)
  user!: UserDto;
}

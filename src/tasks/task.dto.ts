import { Expose, Type } from 'class-transformer';
import { UserDto } from '../users/user.dto';

export class TaskDto {
  @Expose()
  id!: string;

  @Expose()
  title!: string;

  @Expose()
  description!: string;

  @Expose()
  status!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  @Type(() => UserDto)
  user!: UserDto;
}

import { Expose } from 'class-transformer';
import { Role } from '../role.enum';

export class UserDto {
  @Expose()
  id!: string;

  @Expose()
  username!: string;

  @Expose()
  email!: string;

  @Expose()
  roles?: Role[];

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}

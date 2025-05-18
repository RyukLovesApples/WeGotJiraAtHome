import { Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  id!: string;

  @Expose()
  username!: string;

  @Expose()
  email!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}

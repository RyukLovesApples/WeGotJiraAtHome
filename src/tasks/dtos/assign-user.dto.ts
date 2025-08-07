import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AssignUserDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  userId!: string;
}

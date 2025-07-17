import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class TokenParams {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  token!: string;
}

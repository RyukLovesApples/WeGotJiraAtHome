import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendPasswordResetDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

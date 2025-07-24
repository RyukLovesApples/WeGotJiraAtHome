import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class PasswordResetDto {
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  token!: string;

  @IsNotEmpty()
  @Matches(/(?=.*[a-z])/, {
    message: 'Password must contain at least one lowercase letter.',
  })
  @Matches(/(?=.*[A-Z])/, {
    message: 'Password must contain at least one uppercase letter.',
  })
  @Matches(/(?=.*\d)/, {
    message: 'Password must contain at least one number.',
  })
  @Matches(/(?=.*[@$!%*?&])/, {
    message: 'Password must contain at least one special character.',
  })
  @MinLength(10, { message: 'Password must be at least 10 characters long.' })
  password!: string;
}

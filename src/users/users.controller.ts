import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { AuthService } from './auth/auth.service';
import { Public } from './decorators/public.decorator';
import { UserDto } from './dtos/user.dto';
import { transformToDto } from 'src/utils/transform';
import { EmailVerificationService } from 'src/email-verification/email-verification.service';
import { PasswordResetDto } from './dtos/password-reset.dto';
import { UsersService } from './users.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}
  @Post('register')
  @Public()
  public async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserDto> {
    const user = await this.authService.register(createUserDto);
    await this.emailVerificationService.createEmailVerification(user.id);
    return transformToDto(UserDto, user);
  }
  @Post('reset-password')
  @Public()
  public async resetPassword(@Body() { token, password }: PasswordResetDto) {
    await this.usersService.updatePasswordAfterReset(token, password);
  }
}

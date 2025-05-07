import {
  Body,
  Controller,
  InternalServerErrorException,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginUserDto } from '../login-user.dto';
import { AuthService } from './auth.service';
import { LoginResponse } from '../login-user.response';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login')
  public async login(
    @Body() loginUserDto: LoginUserDto,
  ): Promise<LoginResponse> {
    try {
      return await this.authService.login(loginUserDto);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Failed to login: ', error);
      throw new InternalServerErrorException('Something went wrong');
    }
  }
}

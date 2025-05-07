import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginUserDto } from '../login-user.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get()
  public async login(@Body() loginUserDto: LoginUserDto): Promise<string> {
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

import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { LoginUserDto } from '../login-user.dto';
import { AuthService } from './auth.service';
import { LoginResponse } from '../login-user.response';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login')
  @HttpCode(200)
  public async login(
    @Body() loginUserDto: LoginUserDto,
  ): Promise<LoginResponse> {
    return await this.authService.login(loginUserDto);
  }
}

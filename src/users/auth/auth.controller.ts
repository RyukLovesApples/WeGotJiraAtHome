import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { LoginUserDto } from '../login-user.dto';
import { AuthService } from './auth.service';
import { LoginResponse } from '../login-user.response';
import { User } from '../users.entity';
import { AuthRequest } from './auth.request';
import { UsersService } from '../users.service';
import { AuthGuard } from './auth.guard';
import { plainToInstance } from 'class-transformer';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}
  @Post('login')
  @HttpCode(200)
  public async login(
    @Body() loginUserDto: LoginUserDto,
  ): Promise<LoginResponse> {
    return await this.authService.login(loginUserDto);
  }
  @Get('profile')
  @UseGuards(AuthGuard)
  public async profileAccess(@Request() request: AuthRequest): Promise<User> {
    const user = await this.usersService.findOne(request.user.sub);
    if (user) {
      return plainToInstance(User, user, {
        excludeExtraneousValues: true,
      }) as User;
    }
    throw new NotFoundException();
  }
}

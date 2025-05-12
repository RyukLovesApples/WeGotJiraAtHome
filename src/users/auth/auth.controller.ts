import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Request,
} from '@nestjs/common';
import { LoginUserDto } from '../login-user.dto';
import { AuthService } from './auth.service';
import { LoginResponse } from '../login-user.response';
import { AuthRequest } from './auth.request';
import { UsersService } from '../users.service';
import { plainToInstance } from 'class-transformer';
import { UserDto } from '../user.dto';
import { Public } from '../decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}
  @Post('login')
  @Public()
  @HttpCode(200)
  public async login(
    @Body() loginUserDto: LoginUserDto,
  ): Promise<LoginResponse> {
    return await this.authService.login(loginUserDto);
  }
  @Get('profile')
  public async profileAccess(
    @Request() request: AuthRequest,
  ): Promise<UserDto> {
    const user = await this.usersService.findOne(request.user.sub);
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return plainToInstance(UserDto, user, {
        excludeExtraneousValues: true,
      }) as UserDto;
    }
    throw new NotFoundException();
  }
}

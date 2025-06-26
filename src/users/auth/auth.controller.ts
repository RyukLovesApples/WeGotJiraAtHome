import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { LoginUserDto } from '../dtos/login-user.dto';
import { AuthService } from './auth.service';
import { LoginResponse } from '../responses/login-user.response';
import { AuthRequest } from './auth.request';
import { UsersService } from '../users.service';
import { UserDto } from '../dtos/user.dto';
import { Public } from '../decorators/public.decorator';
import { AdminResponse } from '../responses/Admin.response';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../role.enum';
import { plainToInstance } from 'class-transformer';
import { SkipResourceGuard } from 'src/permissions/decorators/skip-resource.decorator';

@UseInterceptors(ClassSerializerInterceptor)
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
  @SkipResourceGuard()
  public async profileAccess(
    @Request() request: AuthRequest,
  ): Promise<UserDto> {
    const user = await this.usersService.findOne(request.user.sub);
    if (user) {
      return plainToInstance(UserDto, user, {
        excludeExtraneousValues: true,
      });
    }
    throw new NotFoundException();
  }
  @Get('admin')
  @SkipResourceGuard()
  @Roles(Role.ADMIN)
  adminAccessOnly(): AdminResponse {
    return new AdminResponse({ message: 'This is for admin only!' });
  }
}

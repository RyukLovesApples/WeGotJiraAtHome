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

@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  @Public()
  public async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserDto> {
    const user = await this.authService.register(createUserDto);
    return transformToDto(UserDto, user);
  }
}

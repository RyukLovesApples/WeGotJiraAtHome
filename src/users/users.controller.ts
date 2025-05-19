import {
  Controller,
  Post,
  Body,
  Logger,
  UseInterceptors,
  SerializeOptions,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from './users.entity';
import { AuthService } from './auth/auth.service';
import { Public } from './decorators/public.decorator';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ strategy: 'excludeAll' })
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly authService: AuthService) {}
  @Post('register')
  @Public()
  public async register(@Body() createUserDto: CreateUserDto): Promise<User> {
    return await this.authService.register(createUserDto);
  }
}

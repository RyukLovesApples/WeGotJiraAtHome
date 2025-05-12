import {
  Controller,
  Post,
  Body,
  Logger,
  UseInterceptors,
  SerializeOptions,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { CreateUserDto } from './create-user.dto';
import { User } from './users.entity';
import { AuthService } from './auth/auth.service';
import { Public } from './decorators/public.decorator';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ strategy: 'excludeAll' })
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly authService: AuthService) {}

  // @Get()
  // public async findOne(username: string, email: string): Promise<User | null> {
  //   try {
  //     const user = await this.userService.findOneUser(username, email);
  //     return user;
  //   } catch (error: unknown) {
  //     if (error instanceof Error) {
  //       this.logger.error(
  //         `Failed to find user with username "${username}" and email "${email}"`,
  //         error.stack,
  //       );
  //     } else {
  //       this.logger.error('An unknown error occurred while fetching user');
  //     }
  //     throw new NotFoundException('User not found');
  //   }
  // }

  @Post('register')
  @Public()
  public async register(@Body() createUserDto: CreateUserDto): Promise<User> {
    return await this.authService.register(createUserDto);
  }
}

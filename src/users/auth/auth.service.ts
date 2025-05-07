import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { PasswordService } from '../password/password.service';
import { CreateUserDto } from '../create-user.dto';
import { User } from '../users.entity';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from '../login-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {}
  public async register(createUserDto: CreateUserDto): Promise<User> {
    try {
      const user = await this.userService.findOneByEmail(createUserDto.email);
      if (user) {
        throw new ConflictException('User with email already exists');
      }
      const registeredUser = await this.userService.createUser(createUserDto);
      return registeredUser;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error('Error during registration:', error);
      throw new InternalServerErrorException(
        'Something went wrong during registration',
      );
    }
  }

  public async login(loginUserDto: LoginUserDto): Promise<string> {
    try {
      const user = await this.userService.findOneByEmail(loginUserDto.email);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const isAuthorized = await this.passwordService.comparePassword(
        loginUserDto.password,
        user.password,
      );
      if (!isAuthorized) {
        throw new UnauthorizedException('Password or email does not match');
      }
      return this.generateJwtToken(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Could not login user: ', error);
      throw new InternalServerErrorException(
        'Something went wrong during login',
      );
    }
  }

  public generateJwtToken(user: User): string {
    const payload = { sub: user.id, username: user.username };
    return this.jwtService.sign(payload);
  }
}

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { PasswordService } from '../password/password.service';
import { CreateUserDto } from '../create-user.dto';
import { User } from '../users.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {}
  public async register(createUserDto: CreateUserDto) {
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

  public async login(email: string, password: string): Promise<string> {
    try {
      const user = await this.userService.findOneByEmail(email);
      const isAuthorized = await this.passwordService.comparePassword(
        password,
        user.password,
      );
      if (!isAuthorized) {
        throw new UnauthorizedException('Password does not match');
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

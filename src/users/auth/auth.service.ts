import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { PasswordService } from '../password/password.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { User } from '../users.entity';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from '../dtos/login-user.dto';
import { LoginResponse } from '../responses/login-user.response';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {}
  public async register(createUserDto: CreateUserDto): Promise<User> {
    const user = await this.userService.findOneByEmail(createUserDto.email);
    if (user) {
      throw new ConflictException('User with email already exists');
    }
    const registeredUser = await this.userService.createUser(createUserDto);
    return registeredUser;
  }

  public async login(loginUserDto: LoginUserDto): Promise<LoginResponse> {
    const user = await this.userService.findOneByEmail(loginUserDto.email);
    if (!user) {
      throw new NotFoundException(
        `User with email ${loginUserDto.email} does not exist`,
      );
    }
    const isAuthorized = await this.passwordService.comparePassword(
      loginUserDto.password,
      user.password,
    );
    if (!isAuthorized) {
      throw new UnauthorizedException('Password or email does not match');
    }
    const accessToken = this.generateJwtToken(user);
    return { accessToken };
  }

  public generateJwtToken(user: User): string {
    const payload = {
      sub: user.id,
      username: user.username,
      roles: user.roles,
    };
    return this.jwtService.sign(payload);
  }
}

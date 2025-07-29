import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { PasswordService } from './password/password.service';
import { Role } from './role.enum';
import { PasswordResetService } from 'src/password-reset/password-reset.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    private readonly passwordService: PasswordService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  public async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    return user;
  }

  public async findOneByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    return user || null;
  }

  public async createUser(userDto: CreateUserDto): Promise<User> {
    const { password, ...rest } = userDto;
    const hashedPassword = await this.passwordService.hashPassword(password);
    const user = this.userRepository.create({
      ...rest,
      password: hashedPassword,
    });
    return await this.userRepository.save(user);
  }

  public async updateUserRole(userId: string, role: Role): Promise<User> {
    const user = await this.findOne(userId);
    user.roles[0] = role;
    this.userRepository.create(user);
    return await this.userRepository.save(user);
  }

  public async updatePasswordAfterReset(
    token: string,
    password: string,
  ): Promise<void> {
    const passwordReset =
      await this.passwordResetService.getPasswordResetById(token);
    if (
      !passwordReset ||
      this.passwordResetService.isExpired(passwordReset.expiresAt)
    ) {
      throw new BadRequestException(
        `Password reset record is expired or does not exist`,
      );
    }
    if (!passwordReset?.confirmed) {
      throw new UnauthorizedException(
        `The token is not falid and has not be confirmed`,
      );
    }
    const user = await this.findOne(passwordReset?.userId);
    const hashedPassword = await this.passwordService.hashPassword(password);
    await this.userRepository.update(user.id, { password: hashedPassword });
    await this.passwordResetService.markAsUsed(token);
  }
}

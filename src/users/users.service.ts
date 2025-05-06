import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { CreateUserDto } from './create-user.dto';
import { PasswordService } from './password/password.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly passwordService: PasswordService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  public async findOne(id: string): Promise<User> {
    try {
      const user = await this.userRepository.findOneBy({ id });
      if (!user) {
        throw new NotFoundException(`User not found`);
      }
      return user;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Error) {
        this.logger.error('Failed to fetch user', error.stack);
      } else {
        this.logger.error('Unknown error occurred while fetching user');
      }
      throw new InternalServerErrorException('Unable to find user');
    }
  }

  public async findOneByEmail(email: string): Promise<User> {
    try {
      const user = await this.userRepository.findOneBy({ email });
      if (!user) {
        throw new NotFoundException(`User with email "${email}" not found.`);
      }
      return user;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to fetch user with email "${email}"`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Unknown error occurred while fetching user with email "${email}"`,
        );
      }
      throw error;
    }
  }

  public async createUser(userDto: CreateUserDto): Promise<User> {
    try {
      const { password, ...rest } = userDto;
      const hashedPassword = await this.passwordService.hashPassword(password);
      const user = this.userRepository.create({
        ...rest,
        password: hashedPassword,
      });
      return await this.userRepository.save(user);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Failed to create new user', error.stack);
      } else {
        this.logger.error('Unknown error occurred while creating new user');
      }
      throw new InternalServerErrorException('Unable to create new user');
    }
  }
}

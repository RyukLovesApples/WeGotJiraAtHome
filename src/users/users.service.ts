import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { CreateUserDto } from './create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  public async findAll(): Promise<User[]> {
    try {
      return await this.userRepository.find();
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Failed to fetch users', error.stack);
      } else {
        this.logger.error('Unknown error occurred while fetching users');
      }
      throw new Error('Internal server error');
    }
  }

  public async findOneUser(username: string, email: string): Promise<User> {
    try {
      const user = await this.userRepository.findOneBy({ username, email });
      if (!user) {
        throw new NotFoundException(
          `User with username "${username}" and email "${email}" not found.`,
        );
      }
      return user;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to fetch user with username "${username}" and email "${email}"`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Unknown error occurred while fetching user with username "${username}" and email "${email}"`,
        );
      }
      throw error;
    }
  }

  public async createUser(userDto: CreateUserDto): Promise<User> {
    try {
      const user = this.userRepository.create(userDto);
      return await this.userRepository.save(user);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Failed to create new user', error.stack);
      } else {
        this.logger.error('Unknown error occurred while creating new user');
      }
      throw new Error('Unable to create new user');
    }
  }
}

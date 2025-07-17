import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { PasswordService } from './password/password.service';
import { Role } from './role.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    private readonly passwordService: PasswordService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
}

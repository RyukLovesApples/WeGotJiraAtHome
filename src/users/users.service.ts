import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { CreateUserDto } from './dtos/create-user.dto';
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
    // should always create the object with create method for serialization (works only on instance of class not plain js object)
    const user = this.userRepository.create({
      ...rest,
      password: hashedPassword,
    });
    return await this.userRepository.save(user);
  }
}

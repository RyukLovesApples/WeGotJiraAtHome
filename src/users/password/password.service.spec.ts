import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('PasswordService', () => {
  let service: PasswordService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();
    service = module.get<PasswordService>(PasswordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  const hashedPassword = 'öasdfkjöasldfksfvni342354/&&%';
  const password = 'asdfas123&LKJ';
  it('should hash password', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
    const result = await service.hashPassword(password);
    expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    expect(result).toBe(hashedPassword);
  });
  it('should verify the password', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(hashedPassword);
    const result = await service.comparePassword(password, hashedPassword);
    expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    expect(result).toBeTruthy();
  });
  it('should fail verifying the password', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const result = await service.comparePassword(password, hashedPassword);
    expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    expect(result).toBe(false);
  });
});

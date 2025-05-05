import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

describe('Create User Dto', () => {
  let dto: CreateUserDto;
  beforeEach(() => {
    dto = new CreateUserDto();
    dto.email = 'adonis@test.com';
    dto.username = 'adonis';
    dto.password = 'Adonis123%';
  });
  it('validate data to be valid user data', async () => {
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
  // email validation
  it('validate data to be invalid user email', async () => {
    dto.email = 'adonistest.com';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });
  // password validation
  const failedPassword = async (password: string, message: string) => {
    dto.password = password;
    const errors = await validate(dto);
    const error = errors.find((err) => err.property === 'password');
    expect(error).not.toBeUndefined();
    const messages = Object.values(error?.constraints ?? {});
    expect(messages).toContain(message);
  };
  it('should fail password validation. missing special character', async () => {
    await failedPassword(
      'adljbasdfV123',
      'Password must contain at least one special character.',
    );
  });
  it('should fail password validation, missing number', async () => {
    await failedPassword(
      'adljbasdfV%asd',
      'Password must contain at least one number.',
    );
  });
  it('should fail password validation, missing uppercase', async () => {
    await failedPassword(
      'adljbasdf%asd23',
      'Password must contain at least one uppercase letter.',
    );
  });
  it('should fail password validation, not enough characters', async () => {
    await failedPassword(
      'f%asdA23',
      'Password must be at least 10 characters long.',
    );
  });
});

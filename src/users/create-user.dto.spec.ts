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
  it('validate data to be invalid user email', async () => {
    dto.email = 'adonistest.com';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });
  it('validate data to be strong password, should be invalid', async () => {
    dto.password = 'adljbasdfV123';
    const errors = await validate(dto);
    const error = errors.find((err) => err.property === 'password');
    expect(error).not.toBeUndefined();
    const messages = Object.values(error?.constraints ?? {});
    expect(messages).toContain('password is not strong enough');
  });
});

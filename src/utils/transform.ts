import { plainToInstance } from 'class-transformer';

export function transformToDto<T>(
  classToTransform: new (...args: any[]) => T,
  plain: any,
): T {
  return plainToInstance(classToTransform, plain, {
    excludeExtraneousValues: true,
  });
}

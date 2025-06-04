import { instanceToPlain, plainToInstance } from 'class-transformer';

export function transformToDto<T>(
  classToTransform: new (...args: any[]) => T,
  entity: any,
): T {
  const plain = instanceToPlain(entity);
  return plainToInstance(classToTransform, plain, {
    excludeExtraneousValues: true,
  });
}

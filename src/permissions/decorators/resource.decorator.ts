import { SetMetadata } from '@nestjs/common';
import { Resource } from '../enums/resource.enum';

export const RESOURCE_KEY = 'resources';
export const Resources = (...resources: Resource[]) =>
  SetMetadata(RESOURCE_KEY, resources);

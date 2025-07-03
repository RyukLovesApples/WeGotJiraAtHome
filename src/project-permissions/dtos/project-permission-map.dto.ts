import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { ResourceDto } from './resource.dto';

export class ProjectPermissionMapDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceDto)
  ADMIN?: ResourceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceDto)
  USER?: ResourceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceDto)
  OWNER?: ResourceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceDto)
  GUEST?: ResourceDto;
}

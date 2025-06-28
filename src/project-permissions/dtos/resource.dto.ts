import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { ActionDto } from './action.dto';

export class ResourceDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ActionDto)
  projects?: ActionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ActionDto)
  tasks?: ActionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ActionDto)
  'project-users'?: ActionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ActionDto)
  invite?: ActionDto;
}

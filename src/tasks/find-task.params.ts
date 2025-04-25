import {
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { TaskStatus } from './task.model';
import { Transform } from 'class-transformer';

export class FindTaskParams {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @MinLength(3)
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }: { value?: string }) => {
    if (!value) return undefined;
    return value
      .split(',')
      .map((label) => label.trim())
      .filter((label) => label.length !== 0);
  })
  labels?: string[];

  @IsOptional()
  @IsIn(['title', 'status', 'createdAt'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortingOrder: 'ASC' | 'DESC' = 'DESC';
}

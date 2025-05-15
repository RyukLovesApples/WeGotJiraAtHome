import {
  IsNotEmpty,
  IsString,
  IsEnum,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { TaskStatus } from './task.model';
import { CreateTaskLabelDto } from './create-task-label.dto';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsEnum(TaskStatus)
  status!: TaskStatus;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskLabelDto)
  labels?: CreateTaskLabelDto[];
}

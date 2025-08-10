import {
  IsNotEmpty,
  IsString,
  IsEnum,
  ValidateNested,
  IsOptional,
  IsUUID,
  IsDate,
} from 'class-validator';
import { TaskStatus } from '../task-status.enum';
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

  @IsOptional()
  @IsString()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsDate()
  dueDate?: Date;
}

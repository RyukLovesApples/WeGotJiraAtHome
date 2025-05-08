// import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
// import { TaskStatus } from './task.model';
import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

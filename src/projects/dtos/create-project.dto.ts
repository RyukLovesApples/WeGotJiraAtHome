import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateTaskDto } from 'src/tasks/dtos/create-task.dto';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  tasks?: CreateTaskDto[];
}

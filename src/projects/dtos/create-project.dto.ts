import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Task } from 'src/tasks/task.entity';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  tasks?: Task[];
}

import { IsUUID } from 'class-validator';
import { UpdateTaskDto } from './update-task.dto';

export class UpdateEmbeddedTaskDto extends UpdateTaskDto {
  @IsUUID()
  id!: string;
}

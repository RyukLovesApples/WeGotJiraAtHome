import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class TaskIdParams {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  taskId!: string;
}

import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ProjectIdParams {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  projectId!: string;
}

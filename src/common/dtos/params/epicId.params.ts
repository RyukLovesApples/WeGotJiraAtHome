import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class EpicIdParams {
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  epicId!: string;
}

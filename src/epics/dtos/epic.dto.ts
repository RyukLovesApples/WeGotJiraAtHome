import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsString, IsUUID } from 'class-validator';
import { EpicStatus } from '../enums/epic-status.enum';
import { EpicPriority } from '../enums/epic-priority.enum';

@Exclude()
export class EpicDto {
  @Expose()
  @IsUUID()
  id!: string;

  @Expose()
  @IsString()
  name!: string;

  @Expose()
  @IsUUID()
  projectId!: string;

  @Expose()
  @IsString()
  description?: string;

  @Expose()
  @IsEnum(EpicStatus)
  status?: EpicStatus;

  @Expose()
  @IsEnum(EpicPriority)
  priority!: EpicPriority;

  @Expose()
  @IsBoolean()
  archived!: boolean;

  @Expose()
  @IsDate()
  startDate?: Date;

  @Expose()
  @IsDate()
  dueDate?: Date;

  @Expose()
  @IsUUID()
  ownerId!: string;

  @Expose()
  @IsString()
  color?: string;
}

import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';
import { Type } from 'class-transformer';
import { UpdateEmbeddedTaskDto } from 'src/tasks/dtos/update-embedded-task.dto';
import { IsOptional, ValidateNested } from 'class-validator';

export class UpdateProjectDto extends PartialType(
  OmitType(CreateProjectDto, ['tasks'] as const),
) {}

export class UpdateProjectWithTasks extends PartialType(
  OmitType(CreateProjectDto, ['tasks'] as const),
) {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateEmbeddedTaskDto)
  tasks?: UpdateEmbeddedTaskDto[];
}

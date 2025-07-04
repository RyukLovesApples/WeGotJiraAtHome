import { IsBoolean, IsOptional } from 'class-validator';

export class ActionDto {
  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @IsOptional()
  @IsBoolean()
  create?: boolean;

  @IsOptional()
  @IsBoolean()
  update?: boolean;

  @IsOptional()
  @IsBoolean()
  delete?: boolean;
}

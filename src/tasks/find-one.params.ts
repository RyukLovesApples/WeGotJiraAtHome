/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class FindOneParams {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  id: string;
}

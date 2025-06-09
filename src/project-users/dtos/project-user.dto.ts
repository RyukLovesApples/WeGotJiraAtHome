import { ObjectType, Field } from '@nestjs/graphql';
import { Exclude, Expose, Type } from 'class-transformer';
import { ProjectRole } from '../project-role.enum';
import { UserGraphOutput } from './user-graph.dto';

@ObjectType()
@Exclude()
export class ProjectUserDto {
  @Field(() => String)
  @Expose()
  id!: string;

  @Field(() => String)
  @Expose()
  userId!: string;

  @Field(() => UserGraphOutput, { nullable: true })
  @Expose()
  @Type(() => UserGraphOutput)
  user?: UserGraphOutput;

  @Field(() => String)
  @Expose()
  projectId!: string;

  @Field(() => ProjectRole)
  @Expose()
  role!: ProjectRole;
}

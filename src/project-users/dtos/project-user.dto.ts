import { ObjectType, Field } from '@nestjs/graphql';
import { Exclude, Expose } from 'class-transformer';
import { ProjectRole } from '../project-role.enum';

@ObjectType()
@Exclude()
export class ProjectUserDto {
  @Field()
  @Expose()
  id!: string;

  @Field()
  @Expose()
  userId!: string;

  @Field()
  @Expose()
  projectId!: string;

  @Field(() => ProjectRole)
  @Expose()
  role!: ProjectRole;
}

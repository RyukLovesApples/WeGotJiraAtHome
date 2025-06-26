import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { ProjectRole } from '../project-role.enum';
import { registerEnumType } from '@nestjs/graphql';
registerEnumType(ProjectRole, { name: 'ProjectRole' });

@InputType()
export class CreateProjectUserInput {
  @Field()
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  // @Field()
  // @IsUUID()
  // @IsNotEmpty()
  // projectId!: string;

  @Field(() => ProjectRole)
  @IsNotEmpty()
  role!: ProjectRole;
}

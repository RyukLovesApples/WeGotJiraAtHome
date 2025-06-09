import { ObjectType, Field } from '@nestjs/graphql';
import { Exclude, Expose } from 'class-transformer';
import { IsUUID } from 'class-validator';

@ObjectType()
@Exclude()
export class UserGraphOutput {
  @IsUUID()
  @Field(() => String)
  @Expose()
  id!: string;
  @Field(() => String)
  @Expose()
  username!: string;
  @Field(() => String, { nullable: true })
  @Expose()
  email?: string;
}

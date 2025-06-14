import { InputType } from '@nestjs/graphql';
import { CreateProjectUserInput } from './create-project-user.dto';

@InputType()
export class UpdateProjectUserRoleInput extends CreateProjectUserInput {}

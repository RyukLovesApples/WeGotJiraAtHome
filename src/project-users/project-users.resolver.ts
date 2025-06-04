import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ProjectUser } from './project-user.entity';
import { ProjectUserDto } from './dtos/project-user.dto';
import { Public } from 'src/users/decorators/public.decorator';
import { CreateProjectUserInput } from './dtos/create-project-user.dto';
import { ProjectUsersService } from './project-users.service';
import { transformToDto } from 'src/utils/transform';
import { UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';

@UseInterceptors(ClassSerializerInterceptor)
@Resolver(() => ProjectUser)
export class ProjectUsersResolver {
  constructor(private readonly projectUsersService: ProjectUsersService) {}
  @Query(() => String)
  @Public()
  healthCheck(): string {
    return 'OK';
  }
  @Mutation(() => ProjectUserDto)
  @Public()
  async create(
    @Args('input') createProjectUserInput: CreateProjectUserInput,
  ): Promise<ProjectUserDto> {
    const projectUser = await this.projectUsersService.create(
      createProjectUserInput,
    );
    return transformToDto(ProjectUserDto, projectUser);
  }
}

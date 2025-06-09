import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ProjectUser } from './project-user.entity';
import { ProjectUserDto } from './dtos/project-user.dto';
import { Public } from 'src/users/decorators/public.decorator';
import { CreateProjectUserInput } from './dtos/create-project-user.dto';
import { ProjectUsersService } from './project-users.service';
import { transformToDto } from 'src/utils/transform';
import { UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { UpdateProjectUserRoleInput } from './dtos/update-project-user.input';
import { plainToInstance } from 'class-transformer';

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
  async createProjectUser(
    @Args('input') createProjectUserInput: CreateProjectUserInput,
  ): Promise<ProjectUserDto> {
    const projectUser = await this.projectUsersService.create(
      createProjectUserInput,
    );
    return transformToDto(ProjectUserDto, projectUser);
  }
  @Mutation(() => ProjectUserDto)
  @Public()
  async updateProjectUser(
    @Args('input') updateProjectUserInput: UpdateProjectUserRoleInput,
  ): Promise<ProjectUserDto> {
    const projectUser = await this.projectUsersService.updateProjectUserRole(
      updateProjectUserInput,
    );
    return transformToDto(ProjectUserDto, projectUser);
  }
  @Mutation(() => Boolean)
  @Public()
  async deleteProjectUser(
    @Args('userId', { type: () => String }) userId: string,
    @Args('projectId', { type: () => String }) projectId: string,
  ): Promise<boolean> {
    await this.projectUsersService.deleteProjectUser(userId, projectId);
    return true;
  }
  @Query(() => ProjectUserDto)
  @Public()
  async getOneProjectUser(
    @Args('userId', { type: () => String }) userId: string,
    @Args('projectId', { type: () => String }) projectId: string,
  ): Promise<ProjectUserDto> {
    const projectUser = await this.projectUsersService.getOneProjectUser(
      userId,
      projectId,
    );
    return transformToDto(ProjectUserDto, projectUser);
  }
  @Query(() => [ProjectUserDto])
  @Public()
  async getAllProjectUsers(
    @Args('projectId', { type: () => String }) projectId: string,
  ): Promise<ProjectUserDto[]> {
    const projectUsers =
      await this.projectUsersService.getAllProjectUsers(projectId);
    return plainToInstance(ProjectUserDto, projectUsers, {
      excludeExtraneousValues: true,
    });
  }
}

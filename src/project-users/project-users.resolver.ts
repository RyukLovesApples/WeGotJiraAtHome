import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ProjectUser } from './project-user.entity';
import { ProjectUserDto } from './dtos/project-user.dto';
import { Public } from 'src/users/decorators/public.decorator';
import { CreateProjectUserInput } from './dtos/create-project-user.dto';
import { ProjectUsersService } from './project-users.service';
import { transformToDto } from 'src/utils/transform';
import {
  UseInterceptors,
  ClassSerializerInterceptor,
  BadRequestException,
} from '@nestjs/common';
import { UpdateProjectUserRoleInput } from './dtos/update-project-user.input';
import { plainToInstance } from 'class-transformer';
import { ProjectUserInviteService } from 'src/invite/project-user-invite.service';
import { CurrentUserId } from 'src/users/decorators/current-user-id.decorator';
import { ProjectUserInvite } from 'src/invite/project-user-invite.entity';
import { Resources } from 'src/permissions/decorators/resource.decorator';
import { Resource } from 'src/permissions/enums/resource.enum';
import { SkipResourceGuard } from 'src/permissions/decorators/skip-resource.decorator';

@UseInterceptors(ClassSerializerInterceptor)
@Resources(Resource.PROJECT_USER)
@Resolver(() => ProjectUser)
export class ProjectUsersResolver {
  constructor(
    private readonly projectUsersService: ProjectUsersService,
    private readonly inviteService: ProjectUserInviteService,
  ) {}
  @Query(() => String)
  @Public()
  healthCheck(): string {
    return 'OK';
  }
  @Mutation(() => ProjectUserDto)
  async createProjectUser(
    @Args('input') createProjectUserInput: CreateProjectUserInput,
    @Args('projectId', { type: () => String }) projectId: string,
  ): Promise<ProjectUserDto> {
    const projectUser = await this.projectUsersService.create(
      createProjectUserInput,
      projectId,
    );
    return transformToDto(ProjectUserDto, projectUser);
  }
  @Mutation(() => ProjectUserDto)
  async updateProjectUser(
    @Args('input') updateProjectUserInput: UpdateProjectUserRoleInput,
    @Args('projectId', { type: () => String }) projectId: string,
  ): Promise<ProjectUserDto> {
    const projectUser = await this.projectUsersService.updateProjectUserRole(
      updateProjectUserInput,
      projectId,
    );
    return transformToDto(ProjectUserDto, projectUser);
  }
  @Mutation(() => Boolean)
  async deleteProjectUser(
    @Args('userId', { type: () => String }) userId: string,
    @Args('projectId', { type: () => String }) projectId: string,
  ): Promise<boolean> {
    await this.projectUsersService.deleteProjectUser(userId, projectId);
    return true;
  }
  @Query(() => ProjectUserDto)
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
  async getAllProjectUsers(
    @Args('projectId', { type: () => String }) projectId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @CurrentUserId() _: string,
  ): Promise<ProjectUserDto[]> {
    const projectUsers =
      await this.projectUsersService.getAllProjectUsers(projectId);
    return plainToInstance(ProjectUserDto, projectUsers, {
      excludeExtraneousValues: true,
    });
  }
  @Mutation(() => Boolean)
  @SkipResourceGuard()
  async acceptProjectInvite(
    @CurrentUserId() userId: string,
    @Args('token', { type: () => String }) token: string,
  ): Promise<boolean> {
    const projectInvite: ProjectUserInvite =
      await this.inviteService.getInviteByToken(token);
    const isExpired = this.inviteService.isExpired(projectInvite.expiresAt);
    if (isExpired) {
      throw new BadRequestException('Invalid or expired invite token');
    }
    const projectUser = {
      userId,
      projectId: projectInvite.projectId,
      role: projectInvite.role,
    };
    await this.projectUsersService.create(projectUser, projectInvite.projectId);
    return true;
  }
}

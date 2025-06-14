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

@UseInterceptors(ClassSerializerInterceptor)
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
  @Mutation(() => Boolean)
  @Public()
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
    await this.projectUsersService.create(projectUser);
    return true;
  }
}

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC } from 'src/users/decorators/public.decorator';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Resource } from '../enums/resource.enum';
import { RESOURCE_KEY } from '../decorators/resource.decorator';
import { PermissionsService } from '../permissions.service';
import { AuthenticatedRequest } from 'src/users/decorators/current-user-id.decorator';
import { SKIP_RESOURCE_GUARD } from '../decorators/skip-resource.decorator';
import { GraphQLResolveInfo } from 'graphql/type';

@Injectable()
export class ResourcePermissionGuard implements CanActivate {
  constructor(
    private readonly permissionService: PermissionsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const skipGuard = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESOURCE_GUARD,
      [context.getHandler(), context.getClass()],
    );
    if (skipGuard) return true;
    const gql = GqlExecutionContext.create(context);
    const gqlCtx = gql.getContext<{
      req: AuthenticatedRequest;
    }>();
    const request =
      gqlCtx?.req ?? context.switchToHttp().getRequest<AuthenticatedRequest>();
    const resource = this.reflector.getAllAndOverride<Resource>(RESOURCE_KEY, [
      context.getClass(),
    ]);
    const info = gql.getInfo<GraphQLResolveInfo>();
    const isGraphQL = gqlCtx?.req !== undefined && info?.operation?.operation;

    const method = isGraphQL
      ? info.operation.operation.toString().toUpperCase() // 'QUERY' | 'MUTATION'
      : request.method; // 'GET', 'POST', etc
    const args = gql.getArgs<{
      projectId?: string;
      input?: { projectId?: string };
    }>();
    const projectId = isGraphQL
      ? (args.projectId ?? args.input?.projectId)
      : request.params?.projectId;

    const userId = request.user?.sub;
    return this.permissionService.checkPermission(
      userId,
      projectId,
      method,
      resource,
    );
  }
}

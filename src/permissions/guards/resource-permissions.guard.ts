import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC } from 'src/users/decorators/public.decorator';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Resource } from '../enums/resource.enum';
import { RESOURCE_KEY } from '../decorators/resource.decorator';
import { PermissionsService } from '../permissions.service';
import { AuthenticatedRequest } from 'src/users/decorators/current-user-id.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
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
    const gqlCtx = GqlExecutionContext.create(context).getContext<{
      req: AuthenticatedRequest;
    }>();
    const request =
      gqlCtx?.req ?? context.switchToHttp().getRequest<AuthenticatedRequest>();
    const resource = this.reflector.getAllAndOverride<Resource>(RESOURCE_KEY, [
      context.getClass(),
    ]);
    const method = request.method;
    const projectId = request.params?.projectId;
    const userId = request.user?.sub;
    return this.permissionService.checkPermission(
      userId,
      projectId,
      method,
      resource,
    );
  }
}

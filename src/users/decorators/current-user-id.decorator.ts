import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtPayload } from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  params?: { projectId: string };
  user: JwtPayload & { sub: string };
}

export const CurrentUserId = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const gqlCtx = GqlExecutionContext.create(context).getContext<{
      req: AuthenticatedRequest;
    }>();
    const request =
      gqlCtx?.req ?? context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user?.sub;
  },
);

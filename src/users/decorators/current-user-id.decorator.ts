/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtPayload } from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
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

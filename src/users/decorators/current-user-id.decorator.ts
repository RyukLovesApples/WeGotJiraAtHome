import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user: JwtPayload & { sub: string };
}

export const CurrentUserId = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user?.sub;
  },
);

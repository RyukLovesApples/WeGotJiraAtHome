/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { GqlArgumentsHost } from '@nestjs/graphql';
import { Request } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const { httpAdapter } = this.httpAdapterHost;
    interface ApolloContext {
      req: Request & {
        body?: {
          operationName?: string;
        };
      };
    }

    function isExpressRequest(req: unknown): req is Request {
      return (
        typeof req === 'object' &&
        req !== null &&
        'method' in req &&
        'url' in req &&
        typeof (req as Request).url === 'string'
      );
    }

    function isGraphQLContext(ctx: unknown): ctx is ApolloContext {
      return (
        typeof ctx === 'object' &&
        ctx !== null &&
        'req' in ctx &&
        typeof (ctx as ApolloContext).req === 'object'
      );
    }

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const extractMessage =
      typeof message === 'string'
        ? message
        : Array.isArray((message as { message?: string | string[] })?.message)
          ? (message as { message?: string[] }).message!.join(', ')
          : ((message as { message?: string })?.message ?? 'Unexpected error');

    let path: string;

    if (host.getType() === 'http') {
      const ctx = host.switchToHttp();
      const reqCandidate = ctx.getRequest() as Request;
      path = isExpressRequest(reqCandidate)
        ? httpAdapter.getRequestUrl(reqCandidate)
        : 'unknown-http-path';
    } else {
      const gqlCtx = GqlArgumentsHost.create(host).getContext();
      path = isGraphQLContext(gqlCtx)
        ? (gqlCtx.req.body?.operationName ?? 'unknown-gql-operation')
        : 'graphql';
    }

    const errorResponse = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path,
      message: extractMessage,
    };

    this.logger.error(errorResponse.message, {
      httpStatus,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    if (host.getType() === 'http') {
      const ctx = host.switchToHttp();
      httpAdapter.reply(ctx.getResponse(), errorResponse, httpStatus);
    } else {
      throw new HttpException(errorResponse, httpStatus);
    }
  }
}

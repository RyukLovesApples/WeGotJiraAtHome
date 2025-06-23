/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as path from 'path';
import * as winston from 'winston';
import safeStringify from 'fast-safe-stringify';

export const winstonLoggerConfig: winston.LoggerOptions = {
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.ms(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
      const msg =
        typeof message === 'string' ? message : safeStringify(message);
      const stackMsg = stack ? `\nStack trace:\n${stack}` : '';
      const metaMsg = Object.keys(meta).length
        ? `\nMetadata: ${safeStringify(meta)}`
        : '';
      return `[${timestamp}] ${level}: ${msg}${stackMsg}${metaMsg}`;
    }),
  ),
  transports: [
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        nestWinstonModuleUtilities.format.nestLike(),
      ),
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: winston.format.json(),
      handleExceptions: true,
    }),
  ],
};

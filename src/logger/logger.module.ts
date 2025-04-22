import { Module } from '@nestjs/common';
import { MessageFormatterService } from 'src/message-formatter/message-formatter.service';
import { LoggerService } from './logger.service';

@Module({
  providers: [LoggerService, MessageFormatterService],
  exports: [LoggerService],
})
export class LoggerModule {}

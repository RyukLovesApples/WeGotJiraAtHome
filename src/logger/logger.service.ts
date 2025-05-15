import { Injectable } from '@nestjs/common';
import { MessageFormatterService } from './../message-formatter/message-formatter.service';

@Injectable()
export class LoggerService {
  constructor(
    private readonly messageFormatterService: MessageFormatterService,
  ) {}

  log(): string {
    return this.messageFormatterService.format('Hello World');
  }
}

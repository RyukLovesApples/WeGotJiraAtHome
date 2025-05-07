import { Injectable } from '@nestjs/common';
import { MessageFormatterService } from './../message-formatter/message-formatter.service';

@Injectable()
export class LoggerService {
  constructor(
    private readonly messageFormatterService: MessageFormatterService,
  ) {}

  log(): string {
    console.log(this.messageFormatterService.format('Hello World'));
    return this.messageFormatterService.format('Hello World');
  }
}

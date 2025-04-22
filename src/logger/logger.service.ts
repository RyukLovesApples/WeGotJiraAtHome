import { Injectable } from '@nestjs/common';
import { MessageFormatterService } from 'src/message-formatter/message-formatter.service';

@Injectable()
export class LoggerService {
  constructor(
    private readonly messageFormatterService: MessageFormatterService,
  ) {}

  log(): void {
    console.log(this.messageFormatterService.format('Hello World'));
  }
}

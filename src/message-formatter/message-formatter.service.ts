import { Injectable } from '@nestjs/common';

@Injectable()
export class MessageFormatterService {
  format(message: string): string {
    return `[${new Date().toISOString()}] ${message}`;
  }
}

import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';
import { AppConfig } from './config/app.config';
import { TypedConfigService } from './config/typed-config.service';

@Injectable()
export class AppService {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly configService: TypedConfigService,
  ) {}
  getHello(): string {
    const prefix = this.configService.get<AppConfig>('app')?.messagePrefix;
    console.log(prefix);
    return this.loggerService.log();
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { TypedConfigService } from './config/typed-config.service';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';

@Injectable()
export class AppService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
    private readonly configService: TypedConfigService,
  ) {}
  getHello(): string {
    const message = 'Hello World';
    return this.logger.log(message);
    // return message;
  }
}

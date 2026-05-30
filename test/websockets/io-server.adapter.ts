import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { ServerOptions } from 'socket.io';

import { Server } from 'socket.io';

export class IoServerAdapter extends IoAdapter {
  constructor(app: INestApplication) {
    super(app);
  }

  public createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: '*', methods: ['GET', 'POST'] },
    }) as Server;

    return server;
  }
}

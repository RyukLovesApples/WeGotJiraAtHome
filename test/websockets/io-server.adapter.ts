import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { ServerOptions } from 'socket.io';

// Import the Server type to ensure correct typing for the return value
import { Server } from 'socket.io';

export class IoServerAdapter extends IoAdapter {
  constructor(app: INestApplication) {
    super(app);
  }

  // Override the method that creates the underlying Socket.io server instance
  public createIOServer(port: number, options?: ServerOptions): Server {
    // Merge custom options (like CORS) with any default options
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: '*', methods: ['GET', 'POST'] },
    }) as Server;

    // You can also add more global server setup here if needed

    return server;
  }
}

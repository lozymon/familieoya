import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { EventPattern, Payload } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import {
  NOTIFICATION_CREATED,
  NotificationCreatedEvent,
} from '@familieoya/contracts';

@WebSocketGateway({ namespace: '/notifications', cors: { origin: '*' } })
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly clients = new Map<string, Socket>(); // userId → socket

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket): void {
    try {
      const token = client.handshake.query['token'] as string;
      if (!token) throw new Error('Missing token');
      const payload = this.jwt.verify<{ sub: string }>(token);
      client.data['userId'] = payload.sub;
      this.clients.set(payload.sub, client);
      this.logger.log(`WS connected: userId=${payload.sub}`);
    } catch {
      this.logger.warn(`WS rejected unauthenticated connection`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data['userId'] as string | undefined;
    if (userId) {
      this.clients.delete(userId);
      this.logger.log(`WS disconnected: userId=${userId}`);
    }
  }

  @EventPattern(NOTIFICATION_CREATED)
  pushToClient(@Payload() event: NotificationCreatedEvent): void {
    const socket = this.clients.get(event.userId);
    socket?.emit('notification', event.notification);
  }
}

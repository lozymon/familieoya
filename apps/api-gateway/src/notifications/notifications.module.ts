import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificationGateway } from './notification.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        publicKey: config
          .getOrThrow<string>('JWT_PUBLIC_KEY')
          .replace(/\\n/g, '\n'),
        algorithms: ['RS256'],
      }),
    }),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            exchange: 'familieoya',
            exchangeType: 'topic',
            queue: 'api-gateway.queue',
            queueOptions: { durable: true },
            noAck: false,
          },
        }),
      },
    ]),
  ],
  providers: [NotificationGateway],
})
export class NotificationsModule {}

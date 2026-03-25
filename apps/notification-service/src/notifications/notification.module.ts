import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { NotificationConsumer } from './notification.consumer';
import { NotificationController } from './notification.controller';
import { InternalController } from './internal.controller';
import { MailerService } from '../mailer/mailer.service';
import { AuthClient } from '../http-clients/auth.client';
import { HouseholdClient } from '../http-clients/household.client';
import { DigestService } from '../digest/digest.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    HttpModule,
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
            wildcards: true,
          },
        }),
      },
    ]),
  ],
  controllers: [
    NotificationConsumer,
    NotificationController,
    InternalController,
  ],
  providers: [
    NotificationService,
    MailerService,
    AuthClient,
    HouseholdClient,
    DigestService,
  ],
})
export class NotificationModule {}

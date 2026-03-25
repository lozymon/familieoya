import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  // RabbitMQ consumer — receives notification.created events for the WebSocket gateway
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
      exchange: 'familieoya',
      exchangeType: 'topic',
      queue: 'api-gateway.queue',
      queueOptions: { durable: true },
      noAck: false,
    },
  });

  await app.startAllMicroservices();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`api-gateway running on port ${port}`);
}

bootstrap();

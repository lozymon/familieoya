import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  // HTTP server (health check)
  const app = await NestFactory.create(AppModule);

  // RabbitMQ consumer
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
      exchange: 'familieoya',
      exchangeType: 'topic',
      queue: 'notification-service',
      queueOptions: { durable: true },
      noAck: false,
    },
  });

  await app.startAllMicroservices();

  const port = process.env.PORT ?? 3005;
  await app.listen(port);
  Logger.log(`notification-service running on port ${port}`);
}

bootstrap();

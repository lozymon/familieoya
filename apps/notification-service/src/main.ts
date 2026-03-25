import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
      exchange: 'familieoya',
      exchangeType: 'topic',
      queue: 'notification-service.queue',
      queueOptions: {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'familieoya.dlq',
          'x-dead-letter-routing-key': 'notification-service.queue.dlq',
        },
      },
      noAck: false,
    },
  });

  await app.startAllMicroservices();

  const port = process.env.PORT ?? 3005;
  await app.listen(port);
  Logger.log(`notification-service running on port ${port}`);
}

bootstrap();

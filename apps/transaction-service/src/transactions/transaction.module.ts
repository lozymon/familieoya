import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Category } from './entities/category.entity';
import { Transaction } from './entities/transaction.entity';
import { CategoryService } from './category.service';
import { TransactionService } from './transaction.service';
import { CategoryController } from './category.controller';
import { TransactionController } from './transaction.controller';
import { InternalController } from './internal.controller';
import { EventConsumer } from './event.consumer';
import { InternalApiGuard } from '@familieoya/common';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Category, Transaction]),
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
    TransactionController,
    CategoryController,
    InternalController,
    EventConsumer,
  ],
  providers: [TransactionService, CategoryService, InternalApiGuard],
})
export class TransactionModule {}

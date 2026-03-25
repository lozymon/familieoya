import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { Budget } from './entities/budget.entity';
import { BudgetSnapshot } from './entities/budget-snapshot.entity';
import { BudgetAlertState } from './entities/budget-alert-state.entity';
import { ProcessedEventId } from './entities/processed-event-id.entity';
import { BudgetService } from './budget.service';
import { BudgetController } from './budget.controller';
import { BudgetConsumer } from './budget.consumer';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Budget,
      BudgetSnapshot,
      BudgetAlertState,
      ProcessedEventId,
    ]),
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
  controllers: [BudgetController, BudgetConsumer],
  providers: [BudgetService],
})
export class BudgetModule {}

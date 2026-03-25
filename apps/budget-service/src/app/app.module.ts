import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from '../health/health.controller';
import { BudgetModule } from '../budget/budget.module';
import { Budget } from '../budget/entities/budget.entity';
import { BudgetSnapshot } from '../budget/entities/budget-snapshot.entity';
import { BudgetAlertState } from '../budget/entities/budget-alert-state.entity';
import { ProcessedEventId } from '../budget/entities/processed-event-id.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [Budget, BudgetSnapshot, BudgetAlertState, ProcessedEventId],
        synchronize: process.env.NODE_ENV !== 'production',
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    BudgetModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from '../health/health.controller';
import { TransactionModule } from '../transactions/transaction.module';
import { Category } from '../transactions/entities/category.entity';
import { Transaction } from '../transactions/entities/transaction.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [Category, Transaction],
        synchronize: process.env.NODE_ENV !== 'production',
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    TransactionModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from '../health/health.controller';
import { AuditModule } from '../audit/audit.module';
import { ActivityLog } from '../audit/entities/activity-log.entity';
import { ProcessedEventId } from '../audit/entities/processed-event-id.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [ActivityLog, ProcessedEventId],
        synchronize: process.env.NODE_ENV !== 'production',
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    AuditModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

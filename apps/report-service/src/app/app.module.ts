import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from '../health/health.controller';
import { ReportModule } from '../report/report.module';
import { ReportSnapshot } from '../report/entities/report-snapshot.entity';
import { ExportHistory } from '../report/entities/export-history.entity';
import { ProcessedEventId } from '../report/entities/processed-event-id.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [ReportSnapshot, ExportHistory, ProcessedEventId],
        synchronize: process.env.NODE_ENV !== 'production',
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    ScheduleModule.forRoot(),
    ReportModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportSnapshot } from './entities/report-snapshot.entity';
import { ExportHistory } from './entities/export-history.entity';
import { ProcessedEventId } from './entities/processed-event-id.entity';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { ReportConsumer } from './report.consumer';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([ReportSnapshot, ExportHistory, ProcessedEventId]),
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
  controllers: [ReportController, ReportConsumer],
  providers: [ReportService],
})
export class ReportModule {}

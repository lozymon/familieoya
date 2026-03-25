import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { ProcessedEventId } from './entities/processed-event-id.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditConsumer } from './audit.consumer';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog, ProcessedEventId])],
  controllers: [AuditController, AuditConsumer],
  providers: [AuditService],
})
export class AuditModule {}

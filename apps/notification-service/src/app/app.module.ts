import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from '../notifications/notification.module';
import { HealthController } from '../health/health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), NotificationModule],
  controllers: [HealthController],
})
export class AppModule {}

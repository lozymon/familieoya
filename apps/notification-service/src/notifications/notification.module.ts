import { Module } from '@nestjs/common';
import { NotificationConsumer } from './notification.consumer';

@Module({
  controllers: [NotificationConsumer],
})
export class NotificationModule {}

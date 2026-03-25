import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Notification } from './notification.entity';
import {
  NOTIFICATION_CREATED,
  NotificationCreatedEvent,
} from '@familieoya/contracts';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    @Inject('RABBITMQ_CLIENT')
    private readonly rmq: ClientProxy,
  ) {}

  async persist(
    userId: string,
    householdId: string,
    type: string,
    message: string,
  ): Promise<Notification> {
    const notification = this.repo.create({
      userId,
      householdId,
      type,
      message,
    });
    await this.repo.save(notification);

    const event: NotificationCreatedEvent = {
      eventId: crypto.randomUUID(),
      userId,
      householdId,
      notification: {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        createdAt: notification.createdAt.toISOString(),
      },
    };
    this.rmq.emit<void, NotificationCreatedEvent>(NOTIFICATION_CREATED, event);

    return notification;
  }

  listForUser(userId: string): Promise<Notification[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.repo.findOne({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.readAt = new Date();
    return this.repo.save(notification);
  }

  listForUserExport(userId: string): Promise<Notification[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async deleteByHousehold(householdId: string): Promise<void> {
    await this.repo.delete({ householdId });
  }
}

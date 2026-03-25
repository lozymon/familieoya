import { BaseEvent } from './base';

export const NOTIFICATION_CREATED = 'notification.created';

export interface NotificationPayload {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface NotificationCreatedEvent extends BaseEvent {
  userId: string;
  householdId: string;
  notification: NotificationPayload;
}

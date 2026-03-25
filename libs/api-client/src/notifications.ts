import { apiClient } from './client';
import type { Notification } from './types';

export async function getNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get<Notification[]>('/notifications');
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

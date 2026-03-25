import { apiClient } from './client';

export interface ActivityLogEntry {
  id: string;
  householdId: string;
  userId: string | null;
  actorName: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function getActivityLog(): Promise<ActivityLogEntry[]> {
  const { data } = await apiClient.get<ActivityLogEntry[]>('/audit/activity');
  return data;
}

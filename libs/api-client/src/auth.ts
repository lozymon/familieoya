import { apiClient } from './client';
import type {
  UserProfile,
  NotificationPreferences,
  PreferredLanguage,
  LoginDto,
} from './types';

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  preferredLanguage?: PreferredLanguage;
}

export type { LoginDto };

export async function register(
  dto: RegisterDto,
): Promise<{ userId: string; email: string }> {
  const { data } = await apiClient.post<{ userId: string; email: string }>(
    '/auth/register',
    dto,
  );
  return data;
}

export async function login(dto: LoginDto): Promise<{ accessToken: string }> {
  const { data } = await apiClient.post<{ accessToken: string }>(
    '/auth/login',
    dto,
  );
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function refresh(): Promise<{ accessToken: string }> {
  const { data } = await apiClient.post<{ accessToken: string }>(
    '/auth/refresh',
  );
  return data;
}

export async function getMe(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>('/auth/me');
  return data;
}

export async function updateMe(
  dto: Partial<Pick<UserProfile, 'name' | 'preferredLanguage'>>,
): Promise<UserProfile> {
  const { data } = await apiClient.patch<UserProfile>('/auth/me', dto);
  return data;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data } = await apiClient.get<NotificationPreferences>(
    '/auth/me/notification-preferences',
  );
  return data;
}

export async function updateNotificationPreferences(
  dto: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const { data } = await apiClient.patch<NotificationPreferences>(
    '/auth/me/notification-preferences',
    dto,
  );
  return data;
}

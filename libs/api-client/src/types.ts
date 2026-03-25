export type PreferredLanguage = 'en' | 'no' | 'pt';

export interface LoginDto {
  email: string;
  password: string;
}

export type Plan = 'free' | 'pro' | 'family';

export interface JwtPayload {
  sub: string;
  email: string;
  plan: Plan;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  preferredLanguage: PreferredLanguage;
  budgetAlerts: boolean;
  householdUpdates: boolean;
  weeklyDigest: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  budgetAlerts: boolean;
  householdUpdates: boolean;
  weeklyDigest: boolean;
}

export interface IncomingNotification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  householdId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface NotificationPreferences {
  email: string;
  budgetAlerts: boolean;
  householdUpdates: boolean;
  weeklyDigest: boolean;
  preferredLanguage: string;
}

@Injectable()
export class AuthClient {
  private readonly logger = new Logger(AuthClient.name);
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = config.getOrThrow<string>('AUTH_SERVICE_URL');
    this.secret = config.getOrThrow<string>('INTERNAL_SECRET');
  }

  async getNotificationPreferences(
    userId: string,
  ): Promise<NotificationPreferences | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<NotificationPreferences>(
          `${this.baseUrl}/internal/users/${userId}/notification-preferences`,
          { headers: { 'x-internal-secret': this.secret } },
        ),
      );
      return res.data;
    } catch (err) {
      this.logger.error(
        `Failed to fetch notification preferences for ${userId}`,
        err,
      );
      return null;
    }
  }
}

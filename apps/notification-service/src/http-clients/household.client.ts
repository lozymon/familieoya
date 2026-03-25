import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface HouseholdMembersResponse {
  memberIds: string[];
}

export interface ActiveHousehold {
  id: string;
  memberIds: string[];
}

@Injectable()
export class HouseholdClient {
  private readonly logger = new Logger(HouseholdClient.name);
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = config.getOrThrow<string>('HOUSEHOLD_SERVICE_URL');
    this.secret = config.getOrThrow<string>('INTERNAL_SECRET');
  }

  async getHouseholdMembers(householdId: string): Promise<string[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<HouseholdMembersResponse>(
          `${this.baseUrl}/internal/households/${householdId}/members`,
          { headers: { 'x-internal-secret': this.secret } },
        ),
      );
      return res.data.memberIds;
    } catch (err) {
      this.logger.error(
        `Failed to fetch members for household ${householdId}`,
        err,
      );
      return [];
    }
  }

  async getActiveHouseholds(): Promise<ActiveHousehold[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<ActiveHousehold[]>(
          `${this.baseUrl}/internal/households/active`,
          { headers: { 'x-internal-secret': this.secret } },
        ),
      );
      return res.data;
    } catch (err) {
      this.logger.error('Failed to fetch active households', err);
      return [];
    }
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class HouseholdGuard implements CanActivate {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const householdId = request.headers['x-household-id'] as string | undefined;
    if (!householdId) {
      throw new ForbiddenException('X-Household-ID header required');
    }

    const userId: string = request.user?.sub;
    const householdUrl = this.config.getOrThrow<string>(
      'HOUSEHOLD_SERVICE_URL',
    );
    const internalSecret = this.config.getOrThrow<string>('INTERNAL_SECRET');

    const { data } = await firstValueFrom(
      this.http.get(
        `${householdUrl}/internal/households/${householdId}/members/${userId}`,
        { headers: { 'x-internal-secret': internalSecret } },
      ),
    );

    request.householdId = householdId;
    return !!data;
  }
}

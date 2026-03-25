import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { RefreshToken } from '../users/refresh-token.entity';
import {
  RegisterDto,
  LoginDto,
  USER_REGISTERED,
  USER_DELETED,
  USER_DATA_EXPORTED,
  UserRegisteredEvent,
  UserDeletedEvent,
  UserDataExportedEvent,
} from '@familieoya/contracts';

const BCRYPT_ROUNDS = 10;
const REFRESH_TOKEN_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    @Inject('RABBITMQ_CLIENT')
    private readonly rmq: ClientProxy,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ userId: string; email: string }> {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.users.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      preferredLanguage: dto.preferredLanguage ?? 'en',
    });
    await this.users.save(user);

    const event: UserRegisteredEvent = {
      eventId: crypto.randomUUID(),
      userId: user.id,
      email: user.email,
      name: user.name,
      preferredLanguage: user.preferredLanguage,
    };
    this.rmq.emit<void, UserRegisteredEvent>(USER_REGISTERED, event);

    return { userId: user.id, email: user.email };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  async refresh(
    userId: string,
    rawToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokens = await this.refreshTokens.find({ where: { userId } });
    let matchedToken: RefreshToken | null = null;

    for (const t of tokens) {
      if (await bcrypt.compare(rawToken, t.tokenHash)) {
        matchedToken = t;
        break;
      }
    }

    if (!matchedToken || matchedToken.expiresAt < new Date()) {
      // Possible token theft — revoke all sessions for this user
      await this.refreshTokens.delete({ userId });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.refreshTokens.delete({ id: matchedToken.id });

    const user = await this.users.findOneOrFail({ where: { id: userId } });
    return this.issueTokens(user);
  }

  async logout(userId: string, rawToken: string): Promise<void> {
    const tokens = await this.refreshTokens.find({ where: { userId } });
    for (const t of tokens) {
      if (await bcrypt.compare(rawToken, t.tokenHash)) {
        await this.refreshTokens.delete({ id: t.id });
        return;
      }
    }
  }

  async getProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...profile } = user;
    return profile;
  }

  async updateNotificationPreferences(
    userId: string,
    prefs: {
      budgetAlerts?: boolean;
      householdUpdates?: boolean;
      weeklyDigest?: boolean;
    },
  ): Promise<{
    budgetAlerts: boolean;
    householdUpdates: boolean;
    weeklyDigest: boolean;
  }> {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    if (prefs.budgetAlerts !== undefined)
      user.budgetAlerts = prefs.budgetAlerts;
    if (prefs.householdUpdates !== undefined)
      user.householdUpdates = prefs.householdUpdates;
    if (prefs.weeklyDigest !== undefined)
      user.weeklyDigest = prefs.weeklyDigest;
    await this.users.save(user);
    return {
      budgetAlerts: user.budgetAlerts,
      householdUpdates: user.householdUpdates,
      weeklyDigest: user.weeklyDigest,
    };
  }

  async updateProfile(
    userId: string,
    body: {
      name?: string;
      email?: string;
      preferredLanguage?: 'en' | 'no' | 'pt';
    },
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    if (body.name !== undefined) user.name = body.name;
    if (body.email !== undefined) user.email = body.email;
    if (body.preferredLanguage !== undefined)
      user.preferredLanguage = body.preferredLanguage;
    await this.users.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...profile } = user;
    return profile;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.users.delete({ id: userId });
    await this.refreshTokens.delete({ userId });

    const event: UserDeletedEvent = {
      eventId: crypto.randomUUID(),
      userId,
    };
    this.rmq.emit<void, UserDeletedEvent>(USER_DELETED, event);
  }

  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const internalSecret = this.config.getOrThrow<string>('INTERNAL_SECRET');
    const headers = { 'x-internal-secret': internalSecret };

    const user = await this.users.findOneOrFail({ where: { id: userId } });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...profile } = user;

    const serviceUrls: Record<string, string> = {
      transactions: this.config.get<string>('TRANSACTION_SERVICE_URL', ''),
      households: this.config.get<string>('HOUSEHOLD_SERVICE_URL', ''),
      notifications: this.config.get<string>('NOTIFICATION_SERVICE_URL', ''),
      audit: this.config.get<string>('AUDIT_SERVICE_URL', ''),
      reports: this.config.get<string>('REPORT_SERVICE_URL', ''),
    };

    const results: Record<string, unknown> = { profile };

    for (const [key, baseUrl] of Object.entries(serviceUrls)) {
      if (!baseUrl) continue;
      try {
        const { data } = await firstValueFrom(
          this.http.get<unknown>(`${baseUrl}/internal/users/${userId}/export`, {
            headers,
          }),
        );
        results[key] = data;
      } catch {
        results[key] = null;
      }
    }

    const event: UserDataExportedEvent = {
      eventId: crypto.randomUUID(),
      userId,
    };
    this.rmq.emit<void, UserDataExportedEvent>(USER_DATA_EXPORTED, event);

    return results;
  }

  private async issueTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      plan: 'free' as const,
    });

    const rawRefreshToken = crypto.randomUUID();
    const tokenHash = await bcrypt.hash(rawRefreshToken, BCRYPT_ROUNDS);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    const refreshTokenEntity = this.refreshTokens.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });
    await this.refreshTokens.save(refreshTokenEntity);

    return { accessToken, refreshToken: rawRefreshToken };
  }
}

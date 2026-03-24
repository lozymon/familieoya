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
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { RefreshToken } from '../users/refresh-token.entity';
import { RegisterDto, LoginDto, USER_REGISTERED, UserRegisteredEvent } from '@familieoya/contracts';

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

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
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

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtStrategy, JwtAuthGuard, HouseholdGuard } from '@familieoya/common';
import { ProxyService } from '../proxy/proxy.service';
import { AuthController } from '../auth/auth.controller';
import { HouseholdController } from '../households/household.controller';
import { HealthController } from '../health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,
    HttpModule,
    ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: 100 }]),
  ],
  controllers: [AuthController, HouseholdController, HealthController],
  providers: [
    ProxyService,
    JwtStrategy,
    JwtAuthGuard,
    HouseholdGuard,
    ConfigService,
  ],
})
export class AppModule {}

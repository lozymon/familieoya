import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HouseholdModule } from '../households/household.module';
import { HealthController } from '../health/health.controller';
import { Household } from '../households/entities/household.entity';
import { HouseholdMember } from '../households/entities/household-member.entity';
import { Invitation } from '../households/entities/invitation.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [Household, HouseholdMember, Invitation],
        synchronize: process.env.NODE_ENV !== 'production',
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    HouseholdModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Household } from './entities/household.entity';
import { HouseholdMember } from './entities/household-member.entity';
import { Invitation } from './entities/invitation.entity';
import { HouseholdService } from './household.service';
import { HouseholdController } from './household.controller';
import { InvitationController } from './invitation.controller';
import { InternalController } from './internal.controller';
import { InternalApiGuard } from '@familieoya/common';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Household, HouseholdMember, Invitation]),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            exchange: 'familieoya',
            exchangeType: 'topic',
          },
        }),
      },
    ]),
  ],
  controllers: [HouseholdController, InvitationController, InternalController],
  providers: [HouseholdService, InternalApiGuard],
})
export class HouseholdModule {}

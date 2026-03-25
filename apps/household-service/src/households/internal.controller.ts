import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InternalApiGuard } from '@familieoya/common';
import { HouseholdService } from './household.service';

@Controller('internal')
@UseGuards(InternalApiGuard)
export class InternalController {
  constructor(private readonly service: HouseholdService) {}

  /** Used by HouseholdGuard in api-gateway to validate membership. */
  @Get('households/:householdId/members/:userId')
  async checkMembership(
    @Param('householdId') householdId: string,
    @Param('userId') userId: string,
  ): Promise<{ isMember: boolean }> {
    const isMember = await this.service.isMember(householdId, userId);
    return { isMember };
  }

  /** Used by notification-service weekly digest. */
  @Get('households/active')
  getActiveHouseholds() {
    return this.service.getActiveHouseholds();
  }

  /** GDPR export — memberships + invitations sent by this user. */
  @Get('users/:userId/export')
  async exportUserData(@Param('userId') userId: string) {
    return this.service.exportUserData(userId);
  }
}

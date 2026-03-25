import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { HouseholdService } from './household.service';

function requireUserId(userId: string | undefined): string {
  if (!userId) throw new UnauthorizedException('x-user-id header missing');
  return userId;
}

@Controller('invitations')
export class InvitationController {
  constructor(private readonly service: HouseholdService) {}

  @Get(':token')
  getInvitation(@Param('token') token: string) {
    return this.service.getInvitation(token);
  }

  @Post(':token/accept')
  acceptInvitation(
    @Param('token') token: string,
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-user-email') userEmail: string | undefined,
  ) {
    if (!userEmail)
      throw new UnauthorizedException('x-user-email header missing');
    return this.service.acceptInvitation(
      token,
      requireUserId(userId),
      userEmail,
    );
  }
}

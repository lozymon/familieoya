import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { HouseholdService } from './household.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { SendInvitationDto } from './dto/send-invitation.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

/** Extracts the trusted x-user-id header set by the api-gateway. */
function requireUserId(userId: string | undefined): string {
  if (!userId) throw new UnauthorizedException('x-user-id header missing');
  return userId;
}

@Controller()
export class HouseholdController {
  constructor(private readonly service: HouseholdService) {}

  @Post('households')
  create(
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: CreateHouseholdDto,
  ) {
    return this.service.createHousehold(requireUserId(userId), dto);
  }

  @Get('households/:id')
  getOne(@Param('id') id: string) {
    return this.service.getHousehold(id);
  }

  @Patch('households/:id')
  update(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: UpdateHouseholdDto,
  ) {
    return this.service.updateHousehold(id, requireUserId(userId), dto);
  }

  @Delete('households/:id')
  remove(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string | undefined,
  ) {
    return this.service.deleteHousehold(id, requireUserId(userId));
  }

  @Get('households/:id/members')
  getMembers(@Param('id') id: string) {
    return this.service.getMembers(id);
  }

  @Post('households/:id/invitations')
  sendInvitation(
    @Param('id') householdId: string,
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-user-name') userName: string | undefined,
    @Body() dto: SendInvitationDto,
  ) {
    return this.service.sendInvitation(
      householdId,
      requireUserId(userId),
      dto,
      userName ?? 'A household admin',
    );
  }

  @Delete('households/:id/members/:userId')
  removeMember(
    @Param('id') householdId: string,
    @Param('userId') targetUserId: string,
    @Headers('x-user-id') userId: string | undefined,
  ) {
    return this.service.removeMember(
      householdId,
      requireUserId(userId),
      targetUserId,
    );
  }

  @Patch('households/:id/members/:userId/role')
  updateRole(
    @Param('id') householdId: string,
    @Param('userId') targetUserId: string,
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.service.updateMemberRole(
      householdId,
      requireUserId(userId),
      targetUserId,
      dto.role,
    );
  }
}

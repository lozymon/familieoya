import {
  Controller,
  Get,
  Headers,
  Param,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { InternalApiGuard } from '@familieoya/common';
import { AuditService } from './audit.service';

function requireHouseholdId(id: string | undefined): string {
  if (!id) throw new UnauthorizedException('x-household-id header missing');
  return id;
}

@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('audit/activity')
  listActivity(@Headers('x-household-id') householdId: string | undefined) {
    return this.auditService.listForHousehold(requireHouseholdId(householdId));
  }

  @Get('internal/users/:userId/export')
  @UseGuards(InternalApiGuard)
  internalUserExport(@Param('userId') userId: string) {
    return this.auditService.listForUser(userId);
  }
}

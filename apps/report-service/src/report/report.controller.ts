import {
  Controller,
  Get,
  Headers,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Param } from '@nestjs/common';
import { Request, Response } from 'express';
import { InternalApiGuard } from '@familieoya/common';
import { ReportService } from './report.service';

function requireHouseholdId(id: string | undefined): string {
  if (!id) throw new UnauthorizedException('x-household-id header missing');
  return id;
}

function requireUserId(id: string | undefined): string {
  if (!id) throw new UnauthorizedException('x-user-id header missing');
  return id;
}

@Controller()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('reports/monthly')
  getMonthly(
    @Headers('x-household-id') householdId: string | undefined,
    @Query('month') month: string,
  ) {
    return this.reportService.getMonthly(
      requireHouseholdId(householdId),
      month,
    );
  }

  @Get('reports/yearly')
  getYearly(
    @Headers('x-household-id') householdId: string | undefined,
    @Query('year') year: string,
  ) {
    return this.reportService.getYearly(requireHouseholdId(householdId), year);
  }

  @Get('reports/member')
  getMember(
    @Headers('x-household-id') householdId: string | undefined,
    @Query('month') month: string,
  ) {
    return this.reportService.getMember(requireHouseholdId(householdId), month);
  }

  @Get('reports/export/csv')
  async exportCsv(
    @Headers('x-household-id') householdId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Query('month') month: string | undefined,
    @Query('year') year: string | undefined,
    @Query('type') type: 'monthly' | 'yearly' | 'member' = 'monthly',
    @Res() res: Response,
  ) {
    const hid = requireHouseholdId(householdId);
    const uid = requireUserId(userId);
    const csv = await this.reportService.exportCsv(hid, uid, type, month, year);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
    res.send(csv);
  }

  @Get('reports/export/history')
  listExportHistory(
    @Headers('x-household-id') householdId: string | undefined,
  ) {
    return this.reportService.listExportHistory(
      requireHouseholdId(householdId),
    );
  }

  @Get('internal/users/:userId/export')
  @UseGuards(InternalApiGuard)
  internalUserExport(@Param('userId') userId: string) {
    return this.reportService.listForUser(userId);
  }
}

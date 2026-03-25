import {
  All,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from '../proxy/proxy.service';
import { JwtAuthGuard, HouseholdGuard } from '@familieoya/common';

/** Routes that need JWT but NOT household membership validation. */
@Controller()
export class HouseholdController {
  constructor(private readonly proxy: ProxyService) {}

  // ── Household management ─────────────────────────────────────────────────

  @Post('households')
  @UseGuards(JwtAuthGuard)
  createHousehold(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'HOUSEHOLD_SERVICE_URL');
  }

  @Get('households/:id')
  @UseGuards(JwtAuthGuard, HouseholdGuard)
  getHousehold(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'HOUSEHOLD_SERVICE_URL');
  }

  @Patch('households/:id')
  @UseGuards(JwtAuthGuard, HouseholdGuard)
  updateHousehold(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'HOUSEHOLD_SERVICE_URL');
  }

  @Delete('households/:id')
  @UseGuards(JwtAuthGuard, HouseholdGuard)
  deleteHousehold(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'HOUSEHOLD_SERVICE_URL');
  }

  @Get('households/:id/members')
  @UseGuards(JwtAuthGuard, HouseholdGuard)
  getMembers(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'HOUSEHOLD_SERVICE_URL');
  }

  @Post('households/:id/invitations')
  @UseGuards(JwtAuthGuard, HouseholdGuard)
  sendInvitation(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'HOUSEHOLD_SERVICE_URL');
  }

  @Delete('households/:id/members/:userId')
  @UseGuards(JwtAuthGuard, HouseholdGuard)
  removeMember(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'HOUSEHOLD_SERVICE_URL');
  }

  @Patch('households/:id/members/:userId/role')
  @UseGuards(JwtAuthGuard, HouseholdGuard)
  updateRole(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'HOUSEHOLD_SERVICE_URL');
  }

  // ── Invitations ──────────────────────────────────────────────────────────

  /** Public — validate a token before login (no auth required). */
  @Get('invitations/:token')
  getInvitation(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'HOUSEHOLD_SERVICE_URL');
  }

  /** Requires login but NOT household membership — user is joining, not yet a member. */
  @Post('invitations/:token/accept')
  @UseGuards(JwtAuthGuard)
  acceptInvitation(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'HOUSEHOLD_SERVICE_URL');
  }
}

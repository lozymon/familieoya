import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard, HouseholdGuard } from '@familieoya/common';
import { ProxyService } from '../proxy/proxy.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, HouseholdGuard)
export class AuditController {
  constructor(private readonly proxy: ProxyService) {}

  @Get('activity')
  activity(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUDIT_SERVICE_URL');
  }
}

import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard, HouseholdGuard } from '@familieoya/common';
import { ProxyService } from '../proxy/proxy.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, HouseholdGuard)
export class ReportController {
  constructor(private readonly proxy: ProxyService) {}

  @Get('monthly')
  monthly(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'REPORT_SERVICE_URL');
  }

  @Get('yearly')
  yearly(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'REPORT_SERVICE_URL');
  }

  @Get('member')
  member(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'REPORT_SERVICE_URL');
  }

  @Get('export/csv')
  exportCsv(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'REPORT_SERVICE_URL');
  }

  @Get('export/history')
  exportHistory(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'REPORT_SERVICE_URL');
  }
}

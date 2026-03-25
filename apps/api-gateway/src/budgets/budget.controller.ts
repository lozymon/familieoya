import {
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

@Controller()
@UseGuards(JwtAuthGuard, HouseholdGuard)
export class BudgetController {
  constructor(private readonly proxy: ProxyService) {}

  @Get('budgets')
  list(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'BUDGET_SERVICE_URL');
  }

  @Get('budgets/status')
  status(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'BUDGET_SERVICE_URL');
  }

  @Post('budgets')
  create(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'BUDGET_SERVICE_URL');
  }

  @Patch('budgets/:id')
  update(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'BUDGET_SERVICE_URL');
  }

  @Delete('budgets/:id')
  remove(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'BUDGET_SERVICE_URL');
  }
}

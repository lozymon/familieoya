import { Controller, Get, Patch, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from '../proxy/proxy.service';
import { JwtAuthGuard } from '@familieoya/common';

@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly proxy: ProxyService) {}

  @Get('notifications')
  list(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'NOTIFICATION_SERVICE_URL');
  }

  @Patch('notifications/:id/read')
  markRead(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'NOTIFICATION_SERVICE_URL');
  }
}

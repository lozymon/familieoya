import { Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { Request } from 'express';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  list(@Req() req: Request) {
    const userId = req.headers['x-user-id'] as string;
    return this.service.listForUser(userId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: Request) {
    const userId = req.headers['x-user-id'] as string;
    return this.service.markRead(id, userId);
  }
}

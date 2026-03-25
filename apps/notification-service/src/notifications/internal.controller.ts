import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InternalApiGuard } from '@familieoya/common';
import { NotificationService } from './notification.service';

@Controller('internal')
@UseGuards(InternalApiGuard)
export class InternalController {
  constructor(private readonly service: NotificationService) {}

  @Get('users/:userId/export')
  export(@Param('userId') userId: string) {
    return this.service.listForUserExport(userId);
  }
}

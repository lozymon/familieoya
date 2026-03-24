import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ThrottleGuard, Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ProxyService } from '../proxy/proxy.service';
import { JwtAuthGuard } from '@familieoya/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly proxy: ProxyService) {}

  @Post('register')
  @UseGuards(ThrottleGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  register(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }

  @Post('login')
  @UseGuards(ThrottleGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }

  @Post('refresh')
  refresh(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }
}

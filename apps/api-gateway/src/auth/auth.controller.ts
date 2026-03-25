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
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ProxyService } from '../proxy/proxy.service';
import { JwtAuthGuard } from '@familieoya/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly proxy: ProxyService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  register(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
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

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteMe(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }

  @Get('me/data-export')
  @UseGuards(JwtAuthGuard)
  dataExport(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }

  @Get('me/notification-preferences')
  @UseGuards(JwtAuthGuard)
  getNotificationPreferences(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }

  @Patch('me/notification-preferences')
  @UseGuards(JwtAuthGuard)
  updateNotificationPreferences(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  twoFaEnable(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }

  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  twoFaVerify(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }

  @Get('2fa/recovery-status')
  @UseGuards(JwtAuthGuard)
  twoFaRecoveryStatus(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }

  @Post('2fa/regenerate')
  @UseGuards(JwtAuthGuard)
  twoFaRegenerate(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }

  @Post('login/recover')
  loginRecover(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, 'AUTH_SERVICE_URL');
  }
}

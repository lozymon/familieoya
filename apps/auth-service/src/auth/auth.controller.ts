import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from '@familieoya/contracts';
import { InternalApiGuard } from '@familieoya/common';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { accessToken };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const userId = req.headers['x-user-id'] as string | undefined;

    if (!rawToken || !userId) throw new UnauthorizedException();

    const { accessToken, refreshToken } = await this.authService.refresh(
      userId,
      rawToken,
    );
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const userId = req.headers['x-user-id'] as string | undefined;

    if (rawToken && userId) {
      await this.authService.logout(userId, rawToken);
    }
    res.clearCookie(REFRESH_COOKIE);
  }

  @Get('me')
  getProfile(@Req() req: Request) {
    const userId = req.headers['x-user-id'] as string;
    return this.authService.getProfile(userId);
  }

  /** Internal endpoint — used by notification-service before sending email */
  @Get('internal/users/:userId/notification-preferences')
  @UseGuards(InternalApiGuard)
  async getNotificationPreferences(
    @Req() req: Request & { params: { userId: string } },
  ) {
    const user = await this.authService.getProfile(req.params.userId);
    return {
      budgetAlerts: user.budgetAlerts,
      householdUpdates: user.householdUpdates,
      preferredLanguage: user.preferredLanguage,
    };
  }
}

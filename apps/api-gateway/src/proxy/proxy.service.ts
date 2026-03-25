import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import type { Method } from 'axios';

interface RequestWithUser extends Request {
  user?: { sub: string; email: string };
  householdId?: string;
}

@Injectable()
export class ProxyService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async forward(
    req: RequestWithUser,
    res: Response,
    targetEnvKey: string,
  ): Promise<void> {
    const baseUrl = this.config.getOrThrow<string>(targetEnvKey);
    const targetUrl = `${baseUrl}${req.path}`;

    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers[k] = v;
    }

    // Inject trust headers — downstream services are on the internal network only
    if (req.user?.sub) headers['x-user-id'] = req.user.sub;
    if (req.user?.email) headers['x-user-email'] = req.user.email;
    if (req.householdId) headers['x-household-id'] = req.householdId;
    // Remove auth header — downstream services use x-user-id instead
    delete headers['authorization'];
    headers['x-internal-secret'] =
      this.config.getOrThrow<string>('INTERNAL_SECRET');

    const upstream = await firstValueFrom(
      this.http.request({
        method: req.method as Method,
        url: targetUrl,
        data: req.body as unknown,
        headers,
        params: req.query as Record<string, string>,
        responseType: 'stream',
        validateStatus: () => true, // don't throw on 4xx/5xx — pass through as-is
      }),
    );

    res.status(upstream.status);
    // Forward upstream response headers (cookies, content-type, etc.)
    for (const [key, value] of Object.entries(upstream.headers)) {
      if (value !== undefined) res.setHeader(key, value as string);
    }
    (upstream.data as NodeJS.ReadableStream).pipe(res);
  }
}

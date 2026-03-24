import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const secret = request.headers['x-internal-secret'];
    const expected = this.config.getOrThrow<string>('INTERNAL_SECRET');
    if (secret !== expected) throw new UnauthorizedException();
    return true;
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  plan: 'free' | 'pro' | 'family';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config
        .getOrThrow<string>('JWT_PUBLIC_KEY')
        .replace(/\\n/g, '\n'),
      algorithms: ['RS256'],
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}

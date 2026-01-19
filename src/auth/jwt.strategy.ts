import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Read token from "Authorization: Bearer <token>"
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  // If the token is valid, this method returns the user data that will be available in Request
  validate(payload: any) {
    return { userId: payload.sub, email: payload.email, roles: payload.roles };
  }
}

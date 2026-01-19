import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // 1. Validate User: Check if email exists and password matches hash
  async signIn(email: string, pass: string): Promise<{ access_token: string }> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(pass, user.password_hash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      email: user.email,
      sub: user.id,
      roles: user.roles,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}

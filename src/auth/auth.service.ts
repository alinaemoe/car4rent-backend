// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { jwtConstants } from './constants';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // 👇 Вспомогательный метод: Генерирует сразу два токена
  async getTokens(userId: string, email: string, roles: string[]) {
    const payload = { sub: userId, email, roles };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtConstants.secret,
        expiresIn: '15m', // Access Token живет 15 минут
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtConstants.refreshSecret,
        expiresIn: '60d', // Refresh Token живет 60 дней
      }),
    ]);

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  // 👇 Вспомогательный метод: Хэширует и сохраняет рефреш-токен в БД
  async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(refreshToken, salt);
    await this.usersService.updateRefreshToken(userId, hash);
  }

  // 1. ЛОГИН
  async signIn(email: string, pass: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(pass, user.password_hash))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const tokens = await this.getTokens(user.id, user.email, user.roles);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return tokens;
  }

  // 2. ОБНОВЛЕНИЕ ТОКЕНА (REFRESH)
  async refreshTokens(userId: string, refreshToken: string) {
    // 1. Ищем юзера
    const user = await this.usersService.findOne(userId);
    if (!user || !user.hashed_refresh_token) {
      throw new ForbiddenException('Доступ запрещен (нет токена)');
    }

    // 2. Сравниваем хэши
    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.hashed_refresh_token,
    );
    if (!isRefreshTokenValid) {
      throw new ForbiddenException('Доступ запрещен (токен недействителен)');
    }

    // 3. Если всё ок, генерируем новую пару
    const tokens = await this.getTokens(user.id, user.email, user.roles);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return tokens;
  }

  // 3. ЛОГАУТ
  async logout(userId: string) {
    // Просто затираем хэш токена в базе (ставим null)
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }
}

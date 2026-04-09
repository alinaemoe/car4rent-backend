// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from './decorators/public.decorator';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService, // 👈 Инжектим сервис для парсинга рефреш-токена
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() refreshDto: RefreshDto) {
    try {
      // Пытаемся расшифровать рефреш-токен, чтобы достать ID юзера (sub)
      const payload = await this.jwtService.verifyAsync(
        refreshDto.refresh_token,
        {
          secret: jwtConstants.refreshSecret,
        },
      );

      // Если токен валидный, передаем в сервис
      return this.authService.refreshTokens(
        payload.sub,
        refreshDto.refresh_token,
      );
    } catch (error) {
      // Если токен протух (прошло 60 дней) или подделан
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  // Защищенный роут! Чтобы разлогиниться, юзер должен прислать живой access_token
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Request() req) {
    return this.authService.logout(req.user.userId);
  }
}

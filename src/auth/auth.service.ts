// src/auth/auth.service.ts
import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { jwtConstants } from './constants';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { UserStatus } from 'src/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // ⚠️ ВРЕМЕННО (защита диплома): хостинг блокирует SMTP, письма с OTP не доходят.
  // Этот мастер-код ВСЕГДА принимается при верификации email и сбросе пароля,
  // в обход проверки реального кода из письма. Локально письма уходят как обычно,
  // и реальный код тоже продолжает работать. На защите вводим именно его.
  private readonly MASTER_OTP = '123456';

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
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
    const user = await this.usersService.findByIdForAuth(userId);
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

  // 4. РЕГИСТРАЦИЯ
  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    let targetUserId: string;

    if (existingUser) {
      if (existingUser.is_email_verified) {
        throw new ConflictException(
          'Пользователь с таким email уже существует',
        );
      }

      // 🔥 ВАЖНО: Вместо удаления (которое ломает БД из-за связей),
      // мы просто ОБНОВЛЯЕМ данные этого "подвисшего" юзера новыми.
      // UsersService.update сам захеширует новый пароль!
      await this.usersService.update(existingUser.id, {
        first_name: dto.first_name,
        last_name: dto.last_name,
        phone: dto.phone,
        password: dto.password,
      });

      targetUserId = existingUser.id;
    } else {
      // Если юзера вообще не было — создаем нового
      const newUser = await this.usersService.create({
        ...dto,
        is_email_verified: false, // 👈
        is_documents_verified: false, // 👈
        status: UserStatus.PENDING_VERIFICATION,
      });

      targetUserId = newUser.id;
    }

    // 3. Генерируем 6-значный OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt();
    const otpHash = await bcrypt.hash(otp, salt);

    // Код живет 15 минут
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // 4. Сохраняем код. Письмо шлём в фоне (fire-and-forget): на проде SMTP
    //    заблокирован, поэтому НЕ ждём отправку и НЕ даём её фейлу сломать
    //    регистрацию. Мобилка сразу получает успех и переходит к вводу OTP.
    //    На защите вводится мастер-код, локально приходит реальное письмо.
    await this.usersService.updateOtpDetails(targetUserId, otpHash, expiresAt);
    this.logger.log(`🔑 OTP для ${dto.email}: ${otp} (мастер-код: ${this.MASTER_OTP})`);
    void this.emailService.sendEmailVerificationOTP(dto.email, otp);

    return { message: 'Код подтверждения отправлен на почту' };
  }

  // 5. ВЕРИФИКАЦИЯ EMAIL
  async verifyEmail(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }
    if (user.is_email_verified) {
      throw new BadRequestException('Email уже подтвержден');
    }

    // ⚠️ ВРЕМЕННО: мастер-код проходит без проверки срока и хэша (SMTP заблокирован).
    if (otp !== this.MASTER_OTP) {
      if (!user.otp_expires_at || user.otp_expires_at < new Date()) {
        throw new BadRequestException('Код подтверждения истек');
      }

      // Сравниваем присланный OTP с хэшем в базе
      const isOtpValid = await bcrypt.compare(otp, user.verification_otp_hash);
      if (!isOtpValid) {
        throw new BadRequestException('Неверный код подтверждения');
      }
    }

    // Если всё ок — верифицируем
    await this.usersService.verifyEmailSuccess(user.id);

    // Сразу генерируем токены, чтобы юзер был залогинен
    const tokens = await this.getTokens(user.id, user.email, user.roles);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return {
      message: 'Email успешно подтвержден',
      ...tokens,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        roles: user.roles,
      },
    };
  }

  // 6. ЗАВЕРШЕНИЕ СЕАНСОВ (ротация refresh token)
  async terminateSessions(userId: string) {
    const user = await this.usersService.findByIdForAuth(userId);
    const tokens = await this.getTokens(user.id, user.email, user.roles);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);
    return tokens;
  }

  // 7. ДЕАКТИВАЦИЯ АККАУНТА (soft delete)
  async deactivateAccount(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    await this.usersService.updateStatus(userId, UserStatus.BANNED);
    return { message: 'Account deactivated' };
  }

  // 8. ПОВТОРНАЯ ОТПРАВКА КОДА
  async resendOtp(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) throw new UnauthorizedException('Пользователь не найден');
    if (user.is_email_verified)
      throw new BadRequestException('Email уже подтвержден');

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt();
    const otpHash = await bcrypt.hash(newOtp, salt);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.usersService.updateOtpDetails(user.id, otpHash, expiresAt);
    // Отправка в фоне (см. register). Фейл SMTP не ломает ответ.
    this.logger.log(`🔑 Повторный OTP для ${user.email}: ${newOtp} (мастер: ${this.MASTER_OTP})`);
    void this.emailService.sendEmailVerificationOTP(user.email, newOtp);

    return { message: 'Новый код подтверждения отправлен на почту' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Пользователь с таким email не найден');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt();
    const otpHash = await bcrypt.hash(otp, salt);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.usersService.updateResetOtpDetails(
      user.id,
      otpHash,
      expiresAt,
      0,
    );
    // Отправка в фоне (см. register). Фейл SMTP не ломает ответ.
    this.logger.log(`🔑 OTP сброса для ${user.email}: ${otp} (мастер: ${this.MASTER_OTP})`);
    void this.emailService.sendPasswordResetOTP(user.email, otp);

    return { message: 'Код для сброса пароля отправлен на почту' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Пользователь с таким email не найден');
    }

    // ⚠️ ВРЕМЕННО: мастер-код проходит без проверок (SMTP заблокирован).
    if (otp !== this.MASTER_OTP) {
      if (!user.reset_password_otp_hash) {
        throw new BadRequestException('Код для сброса не был запрошен');
      }

      if (
        !user.reset_password_otp_expires_at ||
        user.reset_password_otp_expires_at < new Date()
      ) {
        await this.usersService.clearResetOtpDetails(user.id);
        throw new BadRequestException('Код истек. Запросите новый код.');
      }

      if (user.reset_password_attempts >= 5) {
        await this.usersService.clearResetOtpDetails(user.id);
        throw new BadRequestException(
          'Слишком много неверных попыток. Запросите новый код.',
        );
      }

      const isOtpValid = await bcrypt.compare(
        otp,
        user.reset_password_otp_hash,
      );
      if (!isOtpValid) {
        await this.usersService.incrementResetAttempts(user.id);
        const remaining = 4 - user.reset_password_attempts;
        throw new BadRequestException(
          `Неверный код. Осталось попыток: ${Math.max(0, remaining)}`,
        );
      }
    }

    await this.usersService.updatePassword(user.id, newPassword);
    await this.usersService.clearResetOtpDetails(user.id);

    return { message: 'Пароль успешно изменен' };
  }
}

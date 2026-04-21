import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    // В идеале брать из process.env.RESEND_API_KEY
    this.resend = new Resend('REMOVED');
  }

  async sendEmailVerificationOTP(email: string, otp: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: 'Car4Rent <onboarding@resend.dev>', // Если домен не подтвержден в Resend, оставляй этот
        to: email,
        subject: 'Подтверждение регистрации Car4Rent',
        html: `
          <div style="font-family: sans-serif; text-align: center; padding: 20px;">
            <h2>Добро пожаловать в Car4Rent!</h2>
            <p>Ваш код для подтверждения email адреса:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; color: #2196F3;">${otp}</h1>
            <p style="color: #888;">Код действителен 15 минут.</p>
          </div>
        `,
      });
      this.logger.log(`📧 OTP отправлен на ${email}`);
    } catch (error) {
      this.logger.error(`❌ Ошибка отправки Email на ${email}:`, error);
      throw new Error('Не удалось отправить email');
    }
  }
}

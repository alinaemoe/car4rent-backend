import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        // Лучше всего: process.env.EMAIL_USER
        user: 'car4rent.app@gmail.com',
        // Лучше всего: process.env.EMAIL_APP_PASSWORD (16-значный код от Google)
        pass: 'REMOVED',
      },
    });
  }

  async sendEmailVerificationOTP(email: string, otp: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: '"Car4Rent" <твоя_почта@gmail.com>',
        to: email,
        subject: 'Подтверждение регистрации | Car4Rent',
        html: `
          <!DOCTYPE html>
          <html lang="ru">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #F4F7F6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F4F7F6; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;">
                    
                    <tr>
                      <td align="center" style="background-color: #121212; padding: 40px 20px;">
                        <h1 style="color: #FFFFFF; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 1px;">
                          Car<span style="color: #2196F3;">4</span>Rent
                        </h1>
                      </td>
                    </tr>
                    
                    <tr>
                      <td style="padding: 40px 30px; text-align: center;">
                        <h2 style="color: #121212; font-size: 24px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">
                          Добро пожаловать!
                        </h2>
                        <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 32px;">
                          Мы рады видеть вас. Чтобы завершить регистрацию и получить доступ к аренде автомобилей, пожалуйста, введите этот код в приложении:
                        </p>
                        
                        <div style="background-color: #E6F4FE; border-radius: 12px; padding: 24px; display: inline-block; margin-bottom: 32px; border: 1px dashed #2196F3;">
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #2196F3; margin-left: 12px;">
                            ${otp}
                          </span>
                        </div>
                        
                        <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 0;">
                          Код действителен в течение <strong>15 минут</strong>.<br>
                          Если вы не регистрировались в Car4Rent, просто проигнорируйте это письмо.
                        </p>
                      </td>
                    </tr>
                    
                    <tr>
                      <td align="center" style="background-color: #FAFAFA; padding: 24px; border-top: 1px solid #EEEEEE;">
                        <p style="color: #BBBBBB; font-size: 12px; margin: 0;">
                          &copy; ${new Date().getFullYear()} Car4Rent. Все права защищены.
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
      this.logger.log(`📧 OTP отправлен на ${email}, ${otp}`);
    } catch (error) {
      this.logger.error(`❌ Ошибка отправки Email на ${email}:`, error);
      throw new Error('Не удалось отправить email');
    }
  }
}

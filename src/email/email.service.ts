import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly from = `"Car4Rent" <${process.env.MAIL_FROM ?? process.env.MAIL_USER ?? 'no-reply@localhost'}>`;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      // Short timeouts: some hosts block outgoing SMTP ports, and a send attempt
      // should fail in seconds instead of hanging the request.
      connectionTimeout: 7000,
      greetingTimeout: 7000,
      socketTimeout: 7000,
    });
  }

  async sendEmailVerificationOTP(email: string, otp: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Подтверждение регистрации | Car4Rent',
        html: this.buildOtpEmailHtml({
          title: 'Добро пожаловать!',
          body: 'Мы рады видеть вас. Чтобы завершить регистрацию и получить доступ к аренде автомобилей, пожалуйста, введите этот код в приложении:',
          otp,
          footer:
            'Если вы не регистрировались в Car4Rent, просто проигнорируйте это письмо.',
        }),
      });
      this.logger.log(`Verification OTP sent to ${email}`);
    } catch (error) {
      // A failed send must not break registration: the code is already stored,
      // so we only log the failure (never the code itself).
      this.logger.warn(
        `Verification email to ${email} was not sent: ${error?.message ?? ''}`,
      );
    }
  }

  async sendPasswordResetOTP(email: string, otp: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Восстановление пароля | Car4Rent',
        html: this.buildOtpEmailHtml({
          title: 'Запрос на сброс пароля',
          body: 'Мы получили запрос на сброс пароля. Если это были вы, введите код ниже в приложении, чтобы задать новый пароль:',
          otp,
          footer:
            'Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.',
        }),
      });
      this.logger.log(`Password reset OTP sent to ${email}`);
    } catch (error) {
      // Same as above: a failed send does not break the reset flow.
      this.logger.warn(
        `Password reset email to ${email} was not sent: ${error?.message ?? ''}`,
      );
    }
  }

  private buildOtpEmailHtml(opts: {
    title: string;
    body: string;
    otp: string;
    footer: string;
  }) {
    return `
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
                      ${opts.title}
                    </h2>
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 32px;">
                      ${opts.body}
                    </p>
                    <div style="background-color: #E6F4FE; border-radius: 12px; padding: 24px; display: inline-block; margin-bottom: 32px; border: 1px dashed #2196F3;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #2196F3; margin-left: 12px;">
                        ${opts.otp}
                      </span>
                    </div>
                    <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 0;">
                      Код действителен в течение <strong>15 минут</strong>.<br>
                      ${opts.footer}
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
    `;
  }
}

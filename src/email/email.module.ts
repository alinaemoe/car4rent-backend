import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService], // Экспортируем, чтобы использовать в AuthModule
})
export class EmailModule {}

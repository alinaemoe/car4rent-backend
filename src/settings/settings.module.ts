import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { Setting } from '../entities/setting.entity'; // Импорт из общей папки

@Module({
  imports: [TypeOrmModule.forFeature([Setting])], // 👈 Подключили сущность
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}

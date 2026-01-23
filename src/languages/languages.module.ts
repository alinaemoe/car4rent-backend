import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LanguagesService } from './languages.service';
import { LanguagesController } from './languages.controller';
// 👇 Импортируем из ОБЩЕЙ папки
import { Language } from '../entities/language.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Language])], // 👈 Подключаем
  controllers: [LanguagesController],
  providers: [LanguagesService],
  exports: [LanguagesService], // Экспортируем, вдруг пригодится
})
export class LanguagesModule {}

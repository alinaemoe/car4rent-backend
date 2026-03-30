import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarsService } from './cars.service';
import { CarsController } from './cars.controller';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { Car } from '../entities/car.entity'; // Импорт нашей сущности
import { CarImage } from 'src/entities/car-image.entity';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Car, CarImage, User]), // ⚠️ Добавь CarImage сюда!
    CloudinaryModule, // 👈 Подключаем модуль картинок
  ],
  controllers: [CarsController],
  providers: [CarsService],
  exports: [CarsService], // Экспортируем, пригодится для Rentals
})
export class CarsModule {}

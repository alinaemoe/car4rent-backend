import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarsService } from './cars.service';
import { CarsController } from './cars.controller';
import { Car } from '../entities/car.entity'; // Импорт нашей сущности

@Module({
  imports: [TypeOrmModule.forFeature([Car])], // Подключаем репозиторий
  controllers: [CarsController],
  providers: [CarsService],
  exports: [CarsService], // Экспортируем, пригодится для Rentals
})
export class CarsModule {}

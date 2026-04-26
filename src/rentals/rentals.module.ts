import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalsService } from './rentals.service';
import { RentalsController } from './rentals.controller';
import { Rental } from '../entities/rental.entity';
import { CarDamage } from 'src/entities/car-damage.entity';
import { CarsModule } from '../cars/cars.module';
import { RentalCronService } from './rental-cron.service';
import { Transaction } from 'src/entities/transaction.entity'; // 👈 Импорт сущности

@Module({
  imports: [
    // 👇 ВОТ ЗДЕСЬ МАГИЯ: Transaction должен быть внутри массива forFeature!
    TypeOrmModule.forFeature([Rental, CarDamage, Transaction]),
    CarsModule,
  ],
  controllers: [RentalsController],
  providers: [RentalsService, RentalCronService],
})
export class RentalsModule {}

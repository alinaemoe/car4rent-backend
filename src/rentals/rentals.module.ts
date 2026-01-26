import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalsService } from './rentals.service';
import { RentalsController } from './rentals.controller';
import { Rental } from '../entities/rental.entity';
import { CarsModule } from '../cars/cars.module';

@Module({
  imports: [TypeOrmModule.forFeature([Rental]), CarsModule],
  controllers: [RentalsController],
  providers: [RentalsService],
})
export class RentalsModule {}

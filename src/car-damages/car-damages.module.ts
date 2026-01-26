import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarDamagesService } from './car-damages.service';
import { CarDamagesController } from './car-damages.controller';
import { CarDamage } from '../entities/car-damage.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([CarDamage]), CloudinaryModule],
  controllers: [CarDamagesController],
  providers: [CarDamagesService],
  exports: [CarDamagesService],
})
export class CarDamagesModule {}

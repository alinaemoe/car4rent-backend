import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User } from '../entities/user.entity';
import { Car } from '../entities/car.entity';
import { Rental } from '../entities/rental.entity';
import { Transaction } from '../entities/transaction.entity';
import { CarDamage } from '../entities/car-damage.entity';
import { RentalLead } from '../entities/rental-lead.entity';
import { PartnershipRequest } from '../entities/partnership-request.entity';
import { UserDocument } from '../entities/user-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Car,
      Rental,
      Transaction,
      CarDamage,
      RentalLead,
      PartnershipRequest,
      UserDocument,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

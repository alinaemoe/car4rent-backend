import { Module } from '@nestjs/common';
import { RentalLeadsService } from './rental-leads.service';
import { RentalLeadsController } from './rental-leads.controller';

@Module({
  controllers: [RentalLeadsController],
  providers: [RentalLeadsService],
})
export class RentalLeadsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalLeadsService } from './rental-leads.service';
import { RentalLeadsController } from './rental-leads.controller';
import { RentalLead } from 'src/entities/rental-lead.entity';
@Module({
  imports: [TypeOrmModule.forFeature([RentalLead])],
  controllers: [RentalLeadsController],
  providers: [RentalLeadsService],
})
export class RentalLeadsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnershipRequestsService } from './partnership-requests.service';
import { PartnershipRequestsController } from './partnership-requests.controller';
import { PartnershipRequest } from 'src/entities/partnership-request.entity';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([PartnershipRequest]), CloudinaryModule],
  controllers: [PartnershipRequestsController],
  providers: [PartnershipRequestsService],
  exports: [PartnershipRequestsService],
})
export class PartnershipRequestsModule {}

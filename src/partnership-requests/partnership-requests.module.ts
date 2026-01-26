import { Module } from '@nestjs/common';
import { PartnershipRequestsService } from './partnership-requests.service';
import { PartnershipRequestsController } from './partnership-requests.controller';

@Module({
  controllers: [PartnershipRequestsController],
  providers: [PartnershipRequestsService],
})
export class PartnershipRequestsModule {}

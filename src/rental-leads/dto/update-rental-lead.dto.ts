import { IsEnum, IsNotEmpty } from 'class-validator';
import { LeadStatus } from '../../entities/rental-lead.entity';

export class UpdateRentalLeadStatusDto {
  @IsEnum(LeadStatus)
  @IsNotEmpty()
  status: LeadStatus;
}

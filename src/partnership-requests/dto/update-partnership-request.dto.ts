import { IsEnum, IsNotEmpty } from 'class-validator';
import { RequestStatus } from '../../entities/partnership-request.entity';

export class UpdatePartnershipStatusDto {
  @IsEnum(RequestStatus)
  @IsNotEmpty()
  status: RequestStatus;
}

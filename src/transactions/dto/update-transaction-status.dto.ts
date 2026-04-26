import { IsEnum, IsNotEmpty } from 'class-validator';
import { PayoutStatus } from '../../entities/transaction.entity';

export class UpdateTransactionStatusDto {
  @IsEnum(PayoutStatus)
  @IsNotEmpty()
  payout_status: PayoutStatus;
}

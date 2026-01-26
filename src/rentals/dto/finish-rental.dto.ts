import { IsInt, IsPositive, IsNotEmpty } from 'class-validator';

export class FinishRentalDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  end_mileage: number; // Mileage upon return
}

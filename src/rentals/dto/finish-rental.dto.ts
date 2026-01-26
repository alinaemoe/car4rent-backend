import {
  IsInt,
  IsPositive,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  Max,
  Min,
} from 'class-validator';

export class FinishRentalDto {
  @IsInt()
  @IsPositive()
  end_mileage: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  end_fuel: number;

  @IsOptional()
  @IsDateString()
  actual_return_date?: string;
}

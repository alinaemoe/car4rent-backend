import { IsDateString, IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateRentalDto {
  @IsInt()
  @IsNotEmpty()
  car_id: number;

  @IsInt()
  @IsOptional()
  user_id?: number;

  @IsDateString() // Проверяет формат ISO 8601
  @IsNotEmpty()
  start_date: string;

  @IsDateString()
  @IsNotEmpty()
  end_date: string;
}

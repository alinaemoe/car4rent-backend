import { IsDateString, IsInt, IsNotEmpty } from 'class-validator';

export class CreateRentalDto {
  @IsInt()
  @IsNotEmpty()
  car_id: number;

  @IsDateString() // Проверяет формат ISO 8601
  @IsNotEmpty()
  start_date: string;

  @IsDateString()
  @IsNotEmpty()
  end_date: string;
}

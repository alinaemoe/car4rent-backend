import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class StartRentalDto {
  @IsInt()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  start_fuel: number;
}

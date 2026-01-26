import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreatePartnershipDto {
  @IsString()
  @IsNotEmpty()
  owner_name: string;

  @IsString()
  @IsNotEmpty()
  owner_phone: string;

  @IsString()
  @IsNotEmpty()
  car_brand: string;

  @IsString()
  @IsNotEmpty()
  car_model: string;

  @IsInt()
  @Min(1900)
  car_year: number;
}

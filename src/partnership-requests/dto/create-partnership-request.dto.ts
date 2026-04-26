import { IsString, IsNotEmpty } from 'class-validator';

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

  @IsNotEmpty()
  car_year: number | string; // Из FormData цифры часто прилетают как строки
}

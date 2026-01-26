import {
  IsString,
  IsNotEmpty,
  IsPhoneNumber,
  IsOptional,
  IsInt,
  IsDateString,
} from 'class-validator';

export class CreateRentalLeadDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  // @IsPhoneNumber('BY')
  phone: string;

  @IsOptional()
  @IsInt()
  car_id?: number; // optional

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

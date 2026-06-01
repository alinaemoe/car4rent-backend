import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  IsObject,
  IsArray,
} from 'class-validator';
import { CarStatus } from '../../entities/car.entity';

export class CreateCarDto {
  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsInt()
  @Min(1900)
  year: number;

  @IsString()
  @IsNotEmpty()
  license_plate: string;

  @IsString()
  @IsNotEmpty()
  vin: string;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsObject()
  @IsOptional()
  description?: Record<string, string>;

  @IsString()
  @IsNotEmpty()
  body_type: string;

  @IsString()
  @IsNotEmpty()
  drive_type: string;

  @IsString()
  transmission: string;

  @IsString()
  fuel_type: string;

  @IsNumber()
  @IsPositive()
  price_per_day: number;

  @IsNumber()
  @IsOptional()
  mileage_limit_per_day?: number;

  @IsNumber()
  @IsOptional()
  price_per_km_over_limit?: number;

  @IsNumber()
  @IsOptional()
  current_mileage?: number;

  @IsObject()
  @IsOptional()
  location?: { id: number };

  @IsObject()
  @IsOptional()
  owner?: { id: string } | null;

  @IsArray()
  @IsOptional()
  features?: { id: number }[];

  @IsEnum(CarStatus)
  @IsOptional()
  status?: CarStatus;

  // 👇 НОВЫЕ ПОЛЯ ДЛЯ КРУТОГО UI
  @IsObject()
  @IsOptional()
  discount_tiers?: Record<string, number>;

  @IsNumber()
  @IsOptional()
  deposit_amount?: number;

  @IsString()
  @IsOptional()
  insurance_type?: string;

  @IsNumber()
  @IsOptional()
  engine_capacity?: number;

  @IsInt()
  @IsOptional()
  seats?: number;

  @IsOptional()
  is_new?: boolean;

  @IsOptional()
  is_promo?: boolean;

  @IsInt()
  @IsOptional()
  min_age?: number;

  @IsInt()
  @IsOptional()
  min_experience?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  existing_images?: string[];
}

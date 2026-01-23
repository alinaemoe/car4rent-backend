import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  IsObject, // 👈 Импортируем валидатор объекта
} from 'class-validator';
import { CarStatus, FuelType, Transmission } from '../../entities/car.entity';

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

  // 👇 ТЕПЕРЬ ЭТО ОБЪЕКТ
  @IsObject()
  @IsNotEmpty()
  color: Record<string, string>; // Ожидаем { ru: "Черный", en: "Black" }

  // 👇 ДОБАВИЛИ ОПИСАНИЕ
  @IsObject()
  @IsOptional()
  description?: Record<string, string>; // Ожидаем { ru: "Описание...", en: "Desc..." }

  @IsEnum(Transmission)
  transmission: Transmission;

  @IsEnum(FuelType)
  fuel_type: FuelType;

  @IsNumber()
  @IsPositive()
  price_per_day: number;

  @IsNumber()
  @IsOptional()
  mileage_limit_per_day?: number;

  @IsNumber()
  @IsOptional()
  price_per_km_over_limit?: number;

  @IsInt()
  @IsOptional()
  location_id?: number;

  @IsEnum(CarStatus)
  @IsOptional()
  status?: CarStatus;
}

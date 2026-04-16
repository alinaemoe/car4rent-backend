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
import {
  CarStatus,
  FuelType,
  Transmission,
  CarColor,
} from '../../entities/car.entity';

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

  @IsEnum(CarColor)
  @IsNotEmpty()
  color: CarColor;

  @IsObject()
  @IsOptional()
  description?: Record<string, string>;

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

  // Добавляем пробег (был в ошибке)
  @IsNumber()
  @IsOptional()
  current_mileage?: number;

  // Изменили на location (объект с id)
  @IsObject()
  @IsOptional()
  location?: { id: number };

  @IsObject()
  @IsOptional()
  // МЕНЯЕМ ТИП ТУТ: id должен быть string
  owner?: { id: string } | null;

  // Добавляем фичи (был в ошибке)
  // В Autocomplete Multi-select это массив объектов
  @IsArray()
  @IsOptional()
  features?: { id: number }[];

  @IsEnum(CarStatus)
  @IsOptional()
  status?: CarStatus;
}

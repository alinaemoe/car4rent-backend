import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { DamageType } from '../../entities/car-damage.entity';

export class CreateCarDamageDto {
  @IsNotEmpty()
  carId: number; // ID машины

  @IsEnum(DamageType)
  type: DamageType;

  @IsString()
  description: string;

  @IsNumber()
  repair_cost: number;

  @IsString()
  @IsOptional()
  image_url?: string;

  // rentalId опционален, т.к. админ может заметить царапину вне арендыы
  @IsOptional()
  rentalId?: number;
}

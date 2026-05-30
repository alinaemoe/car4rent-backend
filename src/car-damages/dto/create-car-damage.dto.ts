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
  carId: number;

  @IsEnum(DamageType)
  type: DamageType;

  @IsString()
  description: string;

  @IsNumber()
  repair_cost: number;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsOptional()
  rentalId?: number;

  @IsNumber()
  @IsOptional()
  coord_x?: number;

  @IsNumber()
  @IsOptional()
  coord_y?: number;

  @IsNumber()
  @IsOptional()
  coord_z?: number;
}

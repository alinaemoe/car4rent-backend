import {
  IsInt,
  IsPositive,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  Max,
  Min,
  IsEnum,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DamageType } from '../../entities/car-damage.entity';

export class RentalDamageDto {
  @IsEnum(DamageType)
  @IsNotEmpty()
  type: DamageType; // SCRATCH, DENT, etc.

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  repair_cost: number;

  @IsOptional()
  @IsString()
  image_url?: string;

  // 3D-координаты метки повреждения на модели (для 3D-аудита)
  @IsOptional()
  @IsNumber()
  coord_x?: number;

  @IsOptional()
  @IsNumber()
  coord_y?: number;

  @IsOptional()
  @IsNumber()
  coord_z?: number;
}

export class FinishRentalDto {
  @IsInt()
  @IsPositive()
  end_mileage: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  end_fuel: number;

  @IsOptional()
  @IsDateString()
  actual_return_date?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalDamageDto)
  damages?: RentalDamageDto[];
}

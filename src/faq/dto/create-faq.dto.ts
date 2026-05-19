import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class CreateFaqDto {
  @IsObject()
  @IsNotEmpty()
  question: Record<string, string>;

  @IsObject()
  @IsNotEmpty()
  answer: Record<string, string>;

  @IsNumber()
  @IsOptional()
  order_index?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  internal_name: string; // 'air_conditioning'

  @IsObject()
  @IsNotEmpty()
  description: Record<string, string>; // { "ru": "Кондиционер", "en": "Air conditioning" }

  @IsString()
  @IsOptional()
  icon_url?: string;
}

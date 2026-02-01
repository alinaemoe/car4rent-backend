import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  name: string; // "Кондиционер"

  @IsString()
  @IsOptional()
  icon_url?: string;
}

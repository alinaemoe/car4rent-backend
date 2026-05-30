import { IsString, IsOptional } from 'class-validator';

export class CreateSettingDto {
  @IsString()
  key: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

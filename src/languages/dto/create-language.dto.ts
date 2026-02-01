import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateLanguageDto {
  @IsString()
  @Length(2, 5)
  code: string; // 'ru', 'en', 'de'

  @IsString()
  name: string; // 'English', 'Русский'

  @IsOptional()
  @IsString()
  icon_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

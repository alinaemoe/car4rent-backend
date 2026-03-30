import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class CreateTranslationDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  // Ожидаем объект вида { "en": "Value", "ru": "Значение" }
  @IsObject()
  @IsNotEmpty()
  value: Record<string, string>;
}

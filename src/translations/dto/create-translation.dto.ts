import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class CreateTranslationDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsObject() // Проверяем, что пришел JSON объект
  @IsNotEmpty()
  value: Record<string, string>; // { ru: "...", en: "..." }
}

import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';

export class CreateNewsDto {
  @IsObject()
  @IsNotEmpty()
  title: Record<string, string>;

  @IsObject()
  @IsNotEmpty()
  text: Record<string, string>;

  @IsObject()
  @IsNotEmpty()
  badge: Record<string, string>;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

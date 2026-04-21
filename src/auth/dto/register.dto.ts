import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Некорректный email' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Пароль должен быть не менее 6 символов' })
  password: string;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

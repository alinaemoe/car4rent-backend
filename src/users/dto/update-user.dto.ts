import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserRole, UserStatus } from 'src/entities/user.entity';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  // 1. РОЛИ
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  // 2. СТАТУС (Админское поле)
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  // 3. ВЕРИФИКАЦИЯ (Админские поля) 👇 ЗАМЕНИЛИ СТАРОЕ ПОЛЕ НА ДВА НОВЫХ
  @IsOptional()
  @IsBoolean()
  is_email_verified?: boolean;

  @IsOptional()
  @IsBoolean()
  is_documents_verified?: boolean;

  // 4. КОММЕНТАРИЙ АДМИНА
  @IsOptional()
  @IsString()
  admin_comment?: string;

  // 5. ПОЛЯ В snake_case
  // Refine берет данные из базы (first_name) и отправляет их обратно так же.
  // А NestJS по умолчанию ждет camelCase, если DTO не настроен.
  // Мы явно разрешаем snake_case поля:
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

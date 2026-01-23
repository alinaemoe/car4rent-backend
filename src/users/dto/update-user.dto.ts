import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from 'src/entities/user.entity';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];
}

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsPhoneNumber,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Incorrect email' })
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString() // Can be replaced with @IsPhoneNumber('BY')
  @IsNotEmpty()
  phone: string;
}

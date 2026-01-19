import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignInDto {
  @IsEmail({}, { message: 'Incorrect email' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'The password must be longer than 6 characters.' })
  password: string;
}

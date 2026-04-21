import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Код должен состоять из 6 цифр' })
  otp: string;
}

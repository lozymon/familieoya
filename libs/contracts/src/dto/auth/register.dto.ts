import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsIn(['en', 'no', 'pt'])
  @IsOptional()
  preferredLanguage?: 'en' | 'no' | 'pt';
}

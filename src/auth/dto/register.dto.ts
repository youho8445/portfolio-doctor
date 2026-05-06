import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(10)
  password: string;

  @IsBoolean()
  agreeToTerms: boolean;

  @IsBoolean()
  agreeToPrivacy: boolean;

  @IsBoolean()
  agreeToRiskDisclaimer: boolean;

  @IsBoolean()
  @IsOptional()
  agreeToMarketing?: boolean;
}

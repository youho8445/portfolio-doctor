import { IsBoolean, IsOptional } from 'class-validator';

export class ConsentDto {
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

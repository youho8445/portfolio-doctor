import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSecurityDto {
  @IsString()
  @MaxLength(20)
  ticker: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sector?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  assetType?: string;
}

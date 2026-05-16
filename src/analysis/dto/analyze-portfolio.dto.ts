import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class AnalyzePortfolioDto {
  @IsOptional()
  @IsIn(['1M', '3M', '1Y'])
  period?: '1M' | '3M' | '1Y';

  @IsOptional()
  @IsString()
  benchmarkCode?: string;
}

export class GuestAnalysisItemDto {
  @IsString()
  ticker!: string;

  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  weight!: number;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  avgCost?: number;
}

export class GuestAnalysisDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => GuestAnalysisItemDto)
  items!: GuestAnalysisItemDto[];

  @IsOptional()
  @IsIn(['1M', '3M', '1Y'])
  period?: '1M' | '3M' | '1Y';

  @IsOptional()
  @IsString()
  benchmarkCode?: string;
}

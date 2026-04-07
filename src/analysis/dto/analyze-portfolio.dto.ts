import { IsIn, IsOptional, IsString } from 'class-validator';

export class AnalyzePortfolioDto {
  @IsOptional()
  @IsIn(['1M', '3M', '1Y'])
  period?: '1M' | '3M' | '1Y';

  @IsOptional()
  @IsString()
  benchmarkCode?: string;
}

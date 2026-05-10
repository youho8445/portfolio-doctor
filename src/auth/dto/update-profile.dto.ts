import { IsIn, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsIn(['conservative', 'balanced', 'growth', 'aggressive'])
  investorStyle?: 'conservative' | 'balanced' | 'growth' | 'aggressive';

  @IsOptional()
  @IsIn(['KR', 'US', 'BOTH', 'ANY'])
  marketPref?: 'KR' | 'US' | 'BOTH' | 'ANY';

  @IsOptional()
  @IsIn(['ETF', 'STOCK', 'MIXED', 'ANY'])
  productPref?: 'ETF' | 'STOCK' | 'MIXED' | 'ANY';
}

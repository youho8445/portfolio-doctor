import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class AddPortfolioItemDto {
  @IsNumber()
  securityId: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  avgCost?: number;
}

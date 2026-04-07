import { IsDateString, IsNumber, IsOptional } from 'class-validator';

export class CreatePriceDailyDto {
  @IsNumber()
  securityId: number;

  @IsDateString()
  tradeDate: string;

  @IsNumber()
  close: number;

  @IsOptional()
  @IsNumber()
  volume?: number;
}

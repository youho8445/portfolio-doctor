import { IsDateString, IsNumber } from 'class-validator';

export class CreateBenchmarkPriceDailyDto {
  @IsNumber()
  benchmarkId: number;

  @IsDateString()
  tradeDate: string;

  @IsNumber()
  close: number;
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Portfolio } from '../entities/portfolio.entity';
import { PortfolioItem } from '../entities/portfolio-item.entity';
import { PriceDaily } from '../entities/price-daily.entity';
import { Benchmark } from '../entities/benchmark.entity';
import { BenchmarkPriceDaily } from '../entities/benchmark-price-daily.entity';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { HistoryModule } from '../history/history.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Portfolio,
      PortfolioItem,
      PriceDaily,
      Benchmark,
      BenchmarkPriceDaily,
    ]),
    HistoryModule,
    PaymentsModule,
    AdminModule,
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}

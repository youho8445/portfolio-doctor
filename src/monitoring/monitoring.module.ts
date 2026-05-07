import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioStateEvent } from '../entities/portfolio-state-event.entity';
import { PortfolioSnapshot } from '../entities/portfolio-snapshot.entity';
import { Portfolio } from '../entities/portfolio.entity';
import { PortfolioItem } from '../entities/portfolio-item.entity';
import { PriceDaily } from '../entities/price-daily.entity';
import { Benchmark } from '../entities/benchmark.entity';
import { BenchmarkPriceDaily } from '../entities/benchmark-price-daily.entity';
import { PortfolioState } from '../entities/portfolio-state.entity';
import { PushModule } from '../push/push.module';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PortfolioStateEvent, PortfolioSnapshot, Portfolio, PortfolioItem,
      PriceDaily, Benchmark, BenchmarkPriceDaily, PortfolioState,
    ]),
    PushModule,
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}

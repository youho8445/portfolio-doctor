import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppSetting } from '../entities/app-setting.entity';
import { Security } from '../entities/security.entity';
import { PriceDaily } from '../entities/price-daily.entity';
import { Benchmark } from '../entities/benchmark.entity';
import { BenchmarkPriceDaily } from '../entities/benchmark-price-daily.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PriceFetchService } from './price-fetch.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([AppSetting, Security, PriceDaily, Benchmark, BenchmarkPriceDaily]),
  ],
  controllers: [AdminController],
  providers: [AdminService, PriceFetchService],
  exports: [AdminService],
})
export class AdminModule {}

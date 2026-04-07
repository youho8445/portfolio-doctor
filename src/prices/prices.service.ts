import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceDaily } from '../entities/price-daily.entity';
import { Benchmark } from '../entities/benchmark.entity';
import { BenchmarkPriceDaily } from '../entities/benchmark-price-daily.entity';
import { CreatePriceDailyDto } from './dto/create-price-daily.dto';
import { CreateBenchmarkPriceDailyDto } from './dto/create-benchmark-price-daily.dto';

@Injectable()
export class PricesService {
  constructor(
    @InjectRepository(PriceDaily)
    private readonly priceDailyRepository: Repository<PriceDaily>,
    @InjectRepository(Benchmark)
    private readonly benchmarkRepository: Repository<Benchmark>,
    @InjectRepository(BenchmarkPriceDaily)
    private readonly benchmarkPriceDailyRepository: Repository<BenchmarkPriceDaily>,
  ) {}

  async createSecurityPrice(dto: CreatePriceDailyDto) {
    const entity = this.priceDailyRepository.create(dto);
    return this.priceDailyRepository.save(entity);
  }

  async createBenchmark(code: string, name: string) {
    const entity = this.benchmarkRepository.create({ code, name });
    return this.benchmarkRepository.save(entity);
  }

  async createBenchmarkPrice(dto: CreateBenchmarkPriceDailyDto) {
    const entity = this.benchmarkPriceDailyRepository.create(dto);
    return this.benchmarkPriceDailyRepository.save(entity);
  }

  findAllBenchmarks() {
    return this.benchmarkRepository.find();
  }

  async getDataFreshness() {
    const price = await this.priceDailyRepository
      .createQueryBuilder('p')
      .select('MAX(p.tradeDate)', 'lastDate')
      .getRawOne<{ lastDate: string | Date | null }>();

    const benchmark = await this.benchmarkPriceDailyRepository
      .createQueryBuilder('b')
      .select('MAX(b.tradeDate)', 'lastDate')
      .getRawOne<{ lastDate: string | Date | null }>();

    const toDateStr = (v: string | Date | null | undefined): string | null => {
      if (!v) return null;
      return new Date(v).toISOString().slice(0, 10);
    };

    return {
      lastPriceDate:     toDateStr(price?.lastDate),
      lastBenchmarkDate: toDateStr(benchmark?.lastDate),
    };
  }
}

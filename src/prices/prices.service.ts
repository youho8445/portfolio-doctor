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

  async getExchangeRate(): Promise<{ rate: number; midRate: number; source: string; updatedAt: string }> {
    try {
      const { default: YahooFinance } = await import('yahoo-finance2');
      const yf = new (YahooFinance as any)({ suppressNotices: ['ripHistorical'] });
      const quote = await (yf as any).quote('USDKRW=X', {}, { validateResult: false });
      const midRate = Math.round(quote.regularMarketPrice ?? 1400);
      // 매매기준율 기준 살 때 환율 (mid + 약 1.75% 스프레드, 은행 평균)
      const buyRate = Math.round(midRate * 1.0175);
      return {
        rate: buyRate,
        midRate,
        source: 'Yahoo Finance (USDKRW=X)',
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return { rate: 1400, midRate: 1400, source: 'fallback', updatedAt: new Date().toISOString() };
    }
  }

  async getCurrentPrices(securityIds: number[]): Promise<{ securityId: number; price: number }[]> {
    if (!securityIds.length) return [];
    const results: { securityId: number; price: number }[] = [];
    for (const id of securityIds) {
      const row = await this.priceDailyRepository.findOne({
        where: { securityId: id },
        order: { tradeDate: 'DESC' },
      });
      if (row) results.push({ securityId: id, price: Number(row.close) });
    }
    return results;
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

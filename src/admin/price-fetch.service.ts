import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Security } from '../entities/security.entity';
import { Benchmark } from '../entities/benchmark.entity';

export type FetchStatus = 'idle' | 'running' | 'done' | 'error';

export interface FetchResult {
  status: FetchStatus;
  startedAt: string | null;
  finishedAt: string | null;
  success: number;
  failed: number;
  skipped: number;
  totalRows: number;
  failedTickers: string[];
  errorMessage: string | null;
}

@Injectable()
export class PriceFetchService {
  private readonly logger = new Logger(PriceFetchService.name);

  private result: FetchResult = {
    status: 'idle',
    startedAt: null,
    finishedAt: null,
    success: 0,
    failed: 0,
    skipped: 0,
    totalRows: 0,
    failedTickers: [],
    errorMessage: null,
  };

  constructor(
    @InjectRepository(Security)
    private readonly securityRepo: Repository<Security>,
    @InjectRepository(Benchmark)
    private readonly benchmarkRepo: Repository<Benchmark>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  getStatus(): FetchResult {
    return { ...this.result };
  }

  // 평일 오전 8시 (UTC) = 한국시간 오후 5시 (장 마감 후)
  @Cron('0 8 * * 1-5')
  async scheduledFetch() {
    this.logger.log('[Cron] 자동 가격 수집 시작');
    await this.runFetch();
  }

  async runFetch(): Promise<FetchResult> {
    if (this.result.status === 'running') {
      this.logger.warn('이미 실행 중입니다.');
      return this.result;
    }

    this.result = {
      status: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      success: 0,
      failed: 0,
      skipped: 0,
      totalRows: 0,
      failedTickers: [],
      errorMessage: null,
    };

    try {
      const securities = await this.securityRepo.find({ order: { id: 'ASC' } });
      this.logger.log(`대상 종목: ${securities.length}개`);

      for (const sec of securities) {
        try {
          const rows = await this.fetchSecurityPrice(sec.ticker);
          if (rows.length === 0) {
            this.result.skipped++;
            continue;
          }
          await this.upsertPrices(sec.id, rows);
          this.result.success++;
          this.result.totalRows += rows.length;
          this.logger.log(`[OK] ${sec.ticker} — ${rows.length}건`);
        } catch (e) {
          this.logger.error(`[ERROR] ${sec.ticker}: ${e}`);
          this.result.failed++;
          this.result.failedTickers.push(sec.ticker);
        }
      }

      // SP500 벤치마크
      const benchRows = await this.fetchBenchmark();
      this.result.totalRows += benchRows;

      this.result.status = 'done';
    } catch (e) {
      this.result.status = 'error';
      this.result.errorMessage = String(e);
      this.logger.error(`전체 오류: ${e}`);
    } finally {
      this.result.finishedAt = new Date().toISOString();
    }

    return this.result;
  }

  private async fetchSecurityPrice(ticker: string): Promise<{ tradeDate: string; close: number; volume: number }[]> {
    const { default: yahooFinance } = await import('yahoo-finance2');
    const data = await (yahooFinance as any).historical(ticker, {
      period1: this.oneYearAgo(),
      period2: new Date(),
      interval: '1d',
    }, { validateResult: false }).catch(() => []);

    if (!data || data.length === 0) return [];

    return data
      .filter((d: any) => d.close != null)
      .map((d: any) => ({
        tradeDate: new Date(d.date).toISOString().slice(0, 10),
        close: Math.round(d.close * 10000) / 10000,
        volume: d.volume ?? 0,
      }));
  }

  private async upsertPrices(securityId: number, rows: { tradeDate: string; close: number; volume: number }[]) {
    if (rows.length === 0) return;
    await this.dataSource.query(
      `INSERT INTO price_daily (securityId, tradeDate, close, volume)
       VALUES ${rows.map(() => '(?,?,?,?)').join(',')}
       ON DUPLICATE KEY UPDATE close = VALUES(close), volume = VALUES(volume)`,
      rows.flatMap((r) => [securityId, r.tradeDate, r.close, r.volume]),
    );
  }

  private async fetchBenchmark(): Promise<number> {
    try {
      let benchmark = await this.benchmarkRepo.findOne({ where: { code: 'SP500' } });
      if (!benchmark) {
        benchmark = await this.benchmarkRepo.save(this.benchmarkRepo.create({ code: 'SP500', name: 'S&P 500' }));
      }

      const { default: yahooFinance } = await import('yahoo-finance2');
      const data = await (yahooFinance as any).historical('^GSPC', {
        period1: this.oneYearAgo(),
        period2: new Date(),
        interval: '1d',
      }, { validateResult: false }).catch(() => []);

      if (!data || data.length === 0) return 0;

      const rows = data
        .filter((d: any) => d.close != null)
        .map((d: any) => ({
          tradeDate: new Date(d.date).toISOString().slice(0, 10),
          close: Math.round(d.close * 10000) / 10000,
        }));

      if (rows.length > 0) {
        await this.dataSource.query(
          `INSERT INTO benchmark_price_daily (benchmarkId, tradeDate, close)
           VALUES ${rows.map(() => '(?,?,?)').join(',')}
           ON DUPLICATE KEY UPDATE close = VALUES(close)`,
          rows.flatMap((r: any) => [benchmark!.id, r.tradeDate, r.close]),
        );
      }

      this.logger.log(`[OK] SP500 벤치마크 — ${rows.length}건`);
      return rows.length;
    } catch (e) {
      this.logger.error(`[ERROR] SP500 벤치마크: ${e}`);
      return 0;
    }
  }

  private oneYearAgo(): Date {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }
}

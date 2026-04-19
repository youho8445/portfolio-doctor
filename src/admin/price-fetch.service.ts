import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
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
export class PriceFetchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriceFetchService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

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

  onModuleInit() {
    // 1시간마다 체크 — 평일 오전 8시 UTC(한국 오후 5시)에 실행
    this.timer = setInterval(() => this.checkAndRun(), 60 * 60 * 1000);
    this.logger.log('PriceFetchService 스케줄러 시작 (1시간 간격 체크)');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private checkAndRun() {
    const now = new Date();
    const day = now.getUTCDay(); // 0=일, 6=토
    const hour = now.getUTCHours();
    // 평일(1~5) 오전 8시 UTC
    if (day >= 1 && day <= 5 && hour === 8) {
      this.logger.log('[Cron] 자동 가격 수집 시작');
      void this.runFetch();
    }
  }

  getStatus(): FetchResult {
    return { ...this.result };
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
          if (rows.length === 0) { this.result.skipped++; continue; }
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

      this.result.totalRows += await this.fetchBenchmark();
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
    const { default: YahooFinance } = await import('yahoo-finance2');
    const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['ripHistorical'] });
    const data: any[] = await (yahooFinance as any).historical(ticker, {
      period1: this.oneYearAgo(),
      period2: new Date(),
      interval: '1d',
    }, { validateResult: false }).catch(() => []);

    return data
      .filter((d) => d.close != null)
      .map((d) => ({
        tradeDate: new Date(d.date).toISOString().slice(0, 10),
        close: Math.round(d.close * 10000) / 10000,
        volume: d.volume ?? 0,
      }));
  }

  private async upsertPrices(securityId: number, rows: { tradeDate: string; close: number; volume: number }[]) {
    if (!rows.length) return;
    await this.dataSource.query(
      `INSERT INTO price_daily (securityId, tradeDate, close, volume)
       VALUES ${rows.map(() => '(?,?,?,?)').join(',')}
       ON DUPLICATE KEY UPDATE close = VALUES(close), volume = VALUES(volume)`,
      rows.flatMap((r) => [securityId, r.tradeDate, r.close, r.volume]),
    );
  }

  private async fetchBenchmark(): Promise<number> {
    try {
      let bm = await this.benchmarkRepo.findOne({ where: { code: 'SP500' } });
      if (!bm) bm = await this.benchmarkRepo.save(this.benchmarkRepo.create({ code: 'SP500', name: 'S&P 500' }));

      const { default: YahooFinance } = await import('yahoo-finance2');
      const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['ripHistorical'] });
      const data: any[] = await (yahooFinance as any).historical('^GSPC', {
        period1: this.oneYearAgo(),
        period2: new Date(),
        interval: '1d',
      }, { validateResult: false }).catch(() => []);

      const rows = data.filter((d) => d.close != null).map((d) => ({
        tradeDate: new Date(d.date).toISOString().slice(0, 10),
        close: Math.round(d.close * 10000) / 10000,
      }));

      if (rows.length) {
        await this.dataSource.query(
          `INSERT INTO benchmark_price_daily (benchmarkId, tradeDate, close)
           VALUES ${rows.map(() => '(?,?,?)').join(',')}
           ON DUPLICATE KEY UPDATE close = VALUES(close)`,
          rows.flatMap((r) => [bm!.id, r.tradeDate, r.close]),
        );
      }
      this.logger.log(`[OK] SP500 — ${rows.length}건`);
      return rows.length;
    } catch (e) {
      this.logger.error(`SP500 벤치마크 오류: ${e}`);
      return 0;
    }
  }

  private oneYearAgo(): Date {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }
}

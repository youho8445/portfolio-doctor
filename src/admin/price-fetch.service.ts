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
    // 1시간마다 체크
    this.timer = setInterval(() => this.checkAndRun(), 60 * 60 * 1000);
    this.logger.log('PriceFetchService 스케줄러 시작 (1시간 간격 체크)');
    // 서버 재시작 시 즉시 quote 갱신 (배포 후 빈 구간 방지)
    setTimeout(() => void this.runQuoteSync(), 10_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private checkAndRun() {
    const now = new Date();
    const day = now.getUTCDay(); // 0=일, 6=토
    const hour = now.getUTCHours();
    if (day < 1 || day > 5) return; // 주말 스킵

    // 매 시간 quote 빠른 갱신 (UTC 0~23시 평일)
    this.logger.log('[Cron] 시간별 quote 갱신 시작');
    void this.runQuoteSync();

    // 하루 1번 전체 히스토리 갱신 — UTC 8시 (한국 오후 5시)
    if (hour === 8) {
      this.logger.log('[Cron] 일별 전체 히스토리 수집 시작');
      void this.runFetch();
    }
  }

  getStatus(): FetchResult {
    return { ...this.result };
  }

  async runQuoteSync(): Promise<void> {
    // 실제 포트폴리오에 담긴 종목만 조회 (전체 13,879개 아님)
    const rows: { securityId: number; ticker: string }[] = await this.dataSource.query(
      `SELECT DISTINCT pi.securityId, s.ticker
       FROM portfolio_items pi
       JOIN securities s ON s.id = pi.securityId
       WHERE s.assetType != 'CASH'`,
    );

    if (!rows.length) {
      this.logger.log('[QuoteSync] 활성 포트폴리오 종목 없음, 스킵');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const BATCH = 50;
    this.logger.log(`[QuoteSync] 활성 종목 ${rows.length}개 현재가 갱신 시작`);
    let updated = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const tickers = batch.map((r) => r.ticker);
      try {
        const { default: YahooFinance } = await import('yahoo-finance2');
        const yf = new (YahooFinance as any)({ suppressNotices: ['ripHistorical'] });
        const raw = await (yf as any).quote(tickers, {}, { validateResult: false }).catch(() => []);
        const quotes: any[] = Array.isArray(raw) ? raw : [raw];

        for (const q of quotes) {
          const price = q?.regularMarketPrice;
          if (!price) continue;
          const row = batch.find((r) => r.ticker === q.symbol);
          if (!row) continue;
          await this.dataSource.query(
            `INSERT INTO price_daily (securityId, tradeDate, close, volume)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE close = VALUES(close), volume = VALUES(volume)`,
            [row.securityId, today, price, q.regularMarketVolume ?? 0],
          );
          updated++;
        }
      } catch (e) {
        this.logger.error(`[QuoteSync] 배치 오류 (${tickers[0]}~): ${e}`);
      }
    }

    this.logger.log(`[QuoteSync] 완료 — ${updated}/${rows.length}개 갱신`);
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

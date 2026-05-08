import { Injectable, Logger } from '@nestjs/common';

export interface MarketIndex {
  symbol: string;
  name: string;
  description: string;
  value: number | null;
  changePercent: number | null;
  stale: boolean;
}

interface CacheEntry {
  data: MarketIndex[];
  fetchedAt: Date;
}

const SYMBOLS = [
  { symbol: '^GSPC',    name: 'S&P 500',    description: '미국 대표 500개 기업' },
  { symbol: '^IXIC',    name: 'NASDAQ',     description: '미국 기술주 중심 시장' },
  { symbol: '^NDX',     name: 'NASDAQ 100', description: '미국 대형 기술주 100개' },
  { symbol: '^KS11',    name: 'KOSPI',      description: '한국 대표 주식시장' },
  { symbol: '^KQ11',    name: 'KOSDAQ',     description: '한국 성장주 시장' },
  { symbol: 'USDKRW=X', name: 'USD/KRW',   description: '달러 환율' },
] as const;

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private cache: CacheEntry | null = null;

  private getCacheTtlMs(): number {
    const utcMin = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
    // US market hours UTC 13:30–21:00, KR market hours UTC 00:00–06:30
    const inMarketHours =
      (utcMin >= 13 * 60 + 30 && utcMin < 21 * 60) || utcMin < 6 * 60 + 30;
    return inMarketHours ? 5 * 60_000 : 30 * 60_000;
  }

  private isCacheValid(): boolean {
    return !!this.cache && Date.now() - this.cache.fetchedAt.getTime() < this.getCacheTtlMs();
  }

  async getIndices(): Promise<{ updatedAt: string; indices: MarketIndex[] }> {
    if (this.isCacheValid()) {
      return { updatedAt: this.cache!.fetchedAt.toISOString(), indices: this.cache!.data };
    }

    try {
      const { default: YahooFinance } = await import('yahoo-finance2');
      const yf = new (YahooFinance as any)({ suppressNotices: ['ripHistorical'] });
      const tickers = SYMBOLS.map((s) => s.symbol);
      const raw = await (yf as any)
        .quote(tickers, {}, { validateResult: false })
        .catch(() => []);
      const quotes: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

      const data: MarketIndex[] = SYMBOLS.map(({ symbol, name, description }) => {
        const q = quotes.find(
          (q: any) =>
            q?.symbol === symbol ||
            q?.symbol === symbol.replace('^', ''),
        );
        return {
          symbol,
          name,
          description,
          value: q?.regularMarketPrice ?? null,
          changePercent: q?.regularMarketChangePercent ?? null,
          stale: false,
        };
      });

      this.cache = { data, fetchedAt: new Date() };
      this.logger.log(
        `Market indices fetched: ${data.filter((d) => d.value != null).length}/${SYMBOLS.length} ok`,
      );
      return { updatedAt: this.cache.fetchedAt.toISOString(), indices: data };
    } catch (e) {
      this.logger.warn(`Market indices fetch failed: ${e}`);

      if (this.cache) {
        return {
          updatedAt: this.cache.fetchedAt.toISOString(),
          indices: this.cache.data.map((d) => ({ ...d, stale: true })),
        };
      }

      return {
        updatedAt: new Date().toISOString(),
        indices: SYMBOLS.map(({ symbol, name, description }) => ({
          symbol,
          name,
          description,
          value: null,
          changePercent: null,
          stale: true,
        })),
      };
    }
  }
}

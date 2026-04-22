import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Security } from '../entities/security.entity';
import { CreateSecurityDto } from './dto/create-security.dto';

export interface TickerQuote {
  ticker: string;
  name: string;
  price: number;
  priceChange: number;
  priceChangePct: number;
  currency: string;
  marketCap: number | null;
  pe: number | null;
  forwardPe: number | null;
  eps: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  profitMargin: number | null;
  debtToEquity: number | null;
  roe: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyDayAvg: number | null;
  twoHundredDayAvg: number | null;
  volume: number | null;
  avgVolume: number | null;
  sector: string | null;
  industry: string | null;
  dividendYield: number | null;
  priceToBook: number | null;
  history: { time: string; open: number; high: number; low: number; close: number; volume: number }[];
  fetchedAt: string;
}

@Injectable()
export class SecuritiesService {
  // 15분 TTL 인메모리 캐시
  private readonly quoteCache = new Map<string, { data: TickerQuote; expiresAt: number }>();
  private readonly TTL_MS = 15 * 60 * 1000;

  constructor(
    @InjectRepository(Security)
    private readonly securityRepository: Repository<Security>,
  ) {}

  async create(dto: CreateSecurityDto) {
    const security = this.securityRepository.create({
      ticker: dto.ticker.toUpperCase(),
      name: dto.name,
      sector: dto.sector ?? null,
      industry: dto.industry ?? null,
      country: dto.country ?? 'US',
      assetType: dto.assetType ?? 'STOCK',
    } as Security);
    return this.securityRepository.save(security);
  }

  async findAll() {
    return this.securityRepository.find({ order: { id: 'DESC' } });
  }

  async search(query?: string) {
    if (!query) {
      return this.findAll();
    }

    const q = query.trim();
    const dbResults = await this.securityRepository
      .createQueryBuilder('s')
      .where(
        's.ticker LIKE :ticker OR s.name LIKE :q OR s.displayNameKo LIKE :q OR s.searchText LIKE :q',
        { ticker: `%${q.toUpperCase()}%`, q: `%${q}%` },
      )
      // 정확한 티커 일치를 최우선 정렬 (예: VOO 검색 시 IVOO보다 앞에)
      .orderBy(`CASE WHEN s.ticker = :exact THEN 0 ELSE 1 END`, 'ASC')
      .addOrderBy('s.ticker', 'ASC')
      .setParameter('exact', q.toUpperCase())
      .take(20)
      .getMany();

    if (dbResults.length > 0) return dbResults;

    try {
      const { default: YahooFinance } = await import('yahoo-finance2');
      const yf = new (YahooFinance as any)({ suppressNotices: ['ripHistorical'] });

      const searchResult = await (yf as any)
        .search(q, {}, { validateResult: false })
        .catch(() => null);

      const equities: any[] = (searchResult?.quotes ?? [])
        .filter((r: any) => r.quoteType === 'EQUITY' || r.quoteType === 'ETF')
        .slice(0, 10);

      if (!equities.length) return [];

      const symbols: string[] = equities.map((r: any) => r.symbol);
      const raw = await (yf as any)
        .quote(symbols, {}, { validateResult: false })
        .catch(() => []);
      const quotes: any[] = Array.isArray(raw) ? raw : [raw];

      const results: Security[] = [];
      for (const quote of quotes) {
        if (!quote?.symbol) continue;

        const existing = await this.securityRepository.findOne({
          where: { ticker: quote.symbol },
        });
        if (existing) { results.push(existing); continue; }

        const assetType = quote.quoteType === 'ETF' ? 'ETF' : 'STOCK';
        const sec = this.securityRepository.create({
          ticker: quote.symbol,
          name: quote.longName ?? quote.shortName ?? quote.symbol,
          sector: quote.sector ?? null,
          industry: quote.industry ?? null,
          country: quote.market === 'kr_market' ? 'KR' : 'US',
          assetType,
        } as Security);
        const saved = await this.securityRepository.save(sec);
        results.push(saved);
      }

      return results;
    } catch {
      return [];
    }
  }

  async getTickerQuote(ticker: string): Promise<TickerQuote | null> {
    const upper = ticker.toUpperCase();

    const cached = this.quoteCache.get(upper);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const { default: YahooFinance } = await import('yahoo-finance2');
      const yf = new (YahooFinance as any)({ suppressNotices: ['ripHistorical'] });

      const [summary, history] = await Promise.all([
        (yf as any).quoteSummary(upper, {
          modules: ['price', 'financialData', 'defaultKeyStatistics', 'summaryDetail'],
        }, { validateResult: false }).catch(() => null),
        (yf as any).historical(upper, {
          period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          period2: new Date().toISOString().split('T')[0],
          interval: '1d',
        }, { validateResult: false }).catch(() => []),
      ]);

      if (!summary) return null;

      const p = summary.price ?? {};
      const fd = summary.financialData ?? {};
      const ks = summary.defaultKeyStatistics ?? {};
      const sd = summary.summaryDetail ?? {};

      const data: TickerQuote = {
        ticker: upper,
        name: p.longName ?? p.shortName ?? upper,
        price: p.regularMarketPrice ?? 0,
        priceChange: p.regularMarketChange ?? 0,
        priceChangePct: (p.regularMarketChangePercent ?? 0) * 100,
        currency: p.currency ?? 'USD',
        marketCap: p.marketCap ?? null,
        pe: sd.trailingPE ?? ks.trailingPE ?? null,
        forwardPe: sd.forwardPE ?? null,
        eps: ks.trailingEps ?? null,
        revenueGrowth: fd.revenueGrowth != null ? fd.revenueGrowth * 100 : null,
        earningsGrowth: fd.earningsGrowth != null ? fd.earningsGrowth * 100 : null,
        profitMargin: fd.profitMargins != null ? fd.profitMargins * 100 : null,
        debtToEquity: fd.debtToEquity ?? null,
        roe: fd.returnOnEquity != null ? fd.returnOnEquity * 100 : null,
        fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh ?? ks.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: sd.fiftyTwoWeekLow ?? ks.fiftyTwoWeekLow ?? null,
        fiftyDayAvg: sd.fiftyDayAverage ?? p.fiftyDayAverage ?? null,
        twoHundredDayAvg: sd.twoHundredDayAverage ?? p.twoHundredDayAverage ?? null,
        volume: p.regularMarketVolume ?? null,
        avgVolume: sd.averageVolume ?? null,
        sector: null,
        industry: null,
        dividendYield: sd.dividendYield != null ? sd.dividendYield * 100 : null,
        priceToBook: ks.priceToBook ?? null,
        history: (Array.isArray(history) ? history : []).map((h: any) => ({
          time: new Date(h.date).toISOString().split('T')[0],
          open: Number(h.open?.toFixed(2) ?? 0),
          high: Number(h.high?.toFixed(2) ?? 0),
          low: Number(h.low?.toFixed(2) ?? 0),
          close: Number(h.close?.toFixed(2) ?? 0),
          volume: h.volume ?? 0,
        })).filter((h) => h.close > 0),
        fetchedAt: new Date().toISOString(),
      };

      this.quoteCache.set(upper, { data, expiresAt: Date.now() + this.TTL_MS });
      return data;
    } catch {
      return null;
    }
  }
}

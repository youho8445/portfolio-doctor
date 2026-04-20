import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Security } from '../entities/security.entity';
import { CreateSecurityDto } from './dto/create-security.dto';

@Injectable()
export class SecuritiesService {
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
      .orderBy('s.ticker', 'ASC')
      .take(20)
      .getMany();

    if (dbResults.length > 0) return dbResults;

    // DB에 없으면 Yahoo Finance에서 실시간 검색 후 자동 등록
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
}

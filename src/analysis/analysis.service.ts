import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Portfolio } from '../entities/portfolio.entity';
import { PortfolioItem } from '../entities/portfolio-item.entity';
import { PriceDaily } from '../entities/price-daily.entity';
import { Benchmark } from '../entities/benchmark.entity';
import { BenchmarkPriceDaily } from '../entities/benchmark-price-daily.entity';
import { computeScore, ItemMeta } from './score.engine';
import { computeInsights } from './insights.engine';
import { computeRebalance } from './rebalance.engine';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinance = require('yahoo-finance2').default;
const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    @InjectRepository(PortfolioItem)
    private readonly portfolioItemRepository: Repository<PortfolioItem>,
    @InjectRepository(PriceDaily)
    private readonly priceDailyRepository: Repository<PriceDaily>,
    @InjectRepository(Benchmark)
    private readonly benchmarkRepository: Repository<Benchmark>,
    @InjectRepository(BenchmarkPriceDaily)
    private readonly benchmarkPriceDailyRepository: Repository<BenchmarkPriceDaily>,
  ) {}

  async analyzePortfolio(
    portfolioId: number,
    period: '1M' | '3M' | '1Y' = '1Y',
    benchmarkCode = 'SP500',
  ) {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
    });
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const items = await this.portfolioItemRepository.find({
      where: { portfolioId },
      relations: ['security'],
    });

    if (!items.length) {
      return {
        portfolioId,
        portfolioName: portfolio.name,
        period,
        benchmarkCode,
        healthScore: 0,
        diversificationScore: 0,
        scoreBreakdown: [],
        portfolioReturn: 0,
        benchmarkReturn: 0,
        excessReturn: 0,
        personalReturn: null,
        personalReturns: [],
        top3Concentration: 0,
        sectorExposure: [],
        warnings: ['포트폴리오가 비어 있습니다'],
        insights: [],
        rebalanceHints: [],
        portfolioStyle: '-',
      };
    }

    const startDate = this.getStartDate(period);

    // ── 포트폴리오 수익률 계산 ──
    let portfolioReturn = 0;

    for (const item of items) {
      const isCash =
        item.security?.assetType === 'CASH' ||
        item.security?.ticker?.toUpperCase() === 'CASH';

      if (isCash) continue; // 현금은 수익률 0으로 처리

      await this.ensurePriceData(item.securityId, item.security?.ticker ?? '');

      const prices = await this.priceDailyRepository.find({
        where: {
          securityId: item.securityId,
          tradeDate: MoreThanOrEqual(startDate),
        },
        order: { tradeDate: 'ASC' },
      });

      if (prices.length >= 2) {
        const first = Number(prices[0].close);
        const last = Number(prices[prices.length - 1].close);
        const stockReturn = ((last - first) / first) * 100;
        portfolioReturn += (Number(item.weight) / 100) * stockReturn;
      }
    }

    // ── 벤치마크 수익률 계산 ──
    const benchmark = await this.benchmarkRepository.findOne({
      where: { code: benchmarkCode },
    });

    let benchmarkReturn = 0;

    if (benchmark) {
      const benchmarkPrices = await this.benchmarkPriceDailyRepository.find({
        where: {
          benchmarkId: benchmark.id,
          tradeDate: MoreThanOrEqual(startDate),
        },
        order: { tradeDate: 'ASC' },
      });

      if (benchmarkPrices.length >= 2) {
        const first = Number(benchmarkPrices[0].close);
        const last = Number(benchmarkPrices[benchmarkPrices.length - 1].close);
        benchmarkReturn = ((last - first) / first) * 100;
      }
    }

    // ── 상위 3개 집중도 ──
    const sortedWeights = items
      .map((item) => Number(item.weight))
      .sort((a, b) => b - a);

    const top3Concentration = sortedWeights
      .slice(0, 3)
      .reduce((sum, v) => sum + v, 0);

    // ── 섹터 편중 (ETF → 'ETF' 버킷, 현금 → 'Cash' 버킷으로 분리) ──
    const sectorMap: Record<string, number> = {};
    for (const item of items) {
      const isCash =
        item.security?.assetType === 'CASH' ||
        item.security?.ticker?.toUpperCase() === 'CASH';
      const isEtf = item.security?.assetType === 'ETF';

      let sector: string;
      if (isCash) {
        sector = 'Cash';
      } else if (isEtf) {
        sector = 'ETF';
      } else {
        sector = item.security?.sector ?? 'Unknown';
      }
      sectorMap[sector] = (sectorMap[sector] ?? 0) + Number(item.weight);
    }

    const sectorExposure = Object.entries(sectorMap)
      .map(([sector, weight]) => ({ sector, weight }))
      .sort((a, b) => b.weight - a.weight);

    // 점수 계산용 최대 섹터: ETF·Cash 제외
    const scorableSectors = sectorExposure.filter(
      (s) => s.sector !== 'Cash' && s.sector !== 'ETF',
    );
    const maxSectorEntry = scorableSectors[0];
    const maxSectorWeight = maxSectorEntry?.weight ?? 0;
    const maxSectorName = maxSectorEntry?.sector ?? '';

    // ── 개인 수익률 계산 (평단가 기반) ──────────────────────────────────────
    // 평단가가 있는 종목에 한해 현재가 대비 수익률 계산
    const personalReturns: { ticker: string; returnPct: number; weight: number }[] = [];

    for (const item of items) {
      if (!item.avgCost || Number(item.avgCost) <= 0) continue;

      await this.ensurePriceData(item.securityId, item.security?.ticker ?? '');

      const prices = await this.priceDailyRepository.find({
        where: { securityId: item.securityId },
        order: { tradeDate: 'DESC' },
        take: 1,
      });

      if (prices.length > 0) {
        const currentPrice = Number(prices[0].close);
        const cost = Number(item.avgCost);
        const returnPct = ((currentPrice - cost) / cost) * 100;
        personalReturns.push({
          ticker: item.security?.ticker ?? '',
          returnPct: Number(returnPct.toFixed(2)),
          weight: Number(item.weight),
        });
      }
    }

    // 가중 평균 개인 수익률 (평단가 있는 종목들의 비중 합 대비)
    const personalReturnWeightSum = personalReturns.reduce((s, r) => s + r.weight, 0);
    const personalReturn =
      personalReturnWeightSum > 0
        ? personalReturns.reduce((s, r) => s + (r.returnPct * r.weight) / personalReturnWeightSum, 0)
        : null;

    // ── 점수 엔진 ──
    const itemMetas: ItemMeta[] = items.map((item) => ({
      ticker: item.security?.ticker ?? '',
      name: item.security?.displayNameKo || item.security?.name || item.security?.ticker || '',
      weight: Number(item.weight),
      sector: item.security?.sector ?? 'Unknown',
      assetType: item.security?.assetType ?? 'STOCK',
    }));

    const { healthScore, scoreBreakdown, warnings } = computeScore({
      items: itemMetas,
      top3Concentration,
      maxSectorWeight,
      maxSectorName,
      portfolioReturn,
      benchmarkReturn,
    });

    // ── 인사이트 엔진 ──
    const { diversificationScore, insights, rebalanceHints, portfolioStyle } =
      computeInsights({
        items: itemMetas,
        top3Concentration,
        sectorExposure,
        portfolioReturn,
        benchmarkReturn,
      });

    // ── 리밸런싱 엔진 ──
    const rebalanceResult = computeRebalance({
      items: itemMetas,
      currentScore: diversificationScore,
      sectorExposure,
    });

    return {
      portfolioId,
      portfolioName: portfolio.name,
      period,
      benchmarkCode,
      healthScore,
      diversificationScore,
      scoreBreakdown,
      portfolioReturn: Number(portfolioReturn.toFixed(2)),
      benchmarkReturn: Number(benchmarkReturn.toFixed(2)),
      excessReturn: Number((portfolioReturn - benchmarkReturn).toFixed(2)),
      personalReturn: personalReturn !== null ? Number(personalReturn.toFixed(2)) : null,
      personalReturns,
      top3Concentration: Number(top3Concentration.toFixed(2)),
      sectorExposure,
      warnings,
      insights,
      rebalanceHints,
      portfolioStyle,
      rebalanceResult,
    };
  }

  /** 가격 데이터가 없는 종목을 yfinance에서 실시간 fetch해 DB에 저장 */
  private async ensurePriceData(securityId: number, ticker: string): Promise<void> {
    const existing = await this.priceDailyRepository.findOne({
      where: { securityId },
      order: { tradeDate: 'DESC' },
    });
    if (existing) return; // 이미 데이터 있음

    try {
      this.logger.log(`[AUTO-FETCH] ${ticker} 가격 데이터 없음 → yfinance 수집 시작`);
      const period1 = new Date();
      period1.setFullYear(period1.getFullYear() - 1);
      const period2 = new Date();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any[] = await yf.historical(ticker, { period1, period2 });
      if (!result || result.length === 0) {
        this.logger.warn(`[AUTO-FETCH] ${ticker} — 데이터 없음`);
        return;
      }

      const rows = result.map((r: { date: Date; close?: number; adjClose?: number; volume?: number }) => ({
        securityId,
        tradeDate: new Date(r.date).toISOString().slice(0, 10),
        close: r.close ?? r.adjClose ?? 0,
        volume: r.volume ?? 0,
      }));

      await this.priceDailyRepository
        .createQueryBuilder()
        .insert()
        .into(PriceDaily)
        .values(rows)
        .orUpdate(['close', 'volume'], ['securityId', 'tradeDate'])
        .execute();

      this.logger.log(`[AUTO-FETCH] ${ticker} — ${rows.length}건 저장 완료`);
    } catch (e) {
      this.logger.error(`[AUTO-FETCH] ${ticker} 실패: ${e}`);
    }
  }

  private getStartDate(period: '1M' | '3M' | '1Y'): string {
    const date = new Date();
    if (period === '1M') date.setMonth(date.getMonth() - 1);
    else if (period === '3M') date.setMonth(date.getMonth() - 3);
    else date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().slice(0, 10);
  }
}

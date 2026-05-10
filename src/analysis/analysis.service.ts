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
import { HistoryService } from '../history/history.service';
import { PaymentsService } from '../payments/payments.service';
import { AdminService } from '../admin/admin.service';
import { MonitoringService } from '../monitoring/monitoring.service';
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
    private readonly historyService: HistoryService,
    private readonly paymentsService: PaymentsService,
    private readonly adminService: AdminService,
    private readonly monitoringService: MonitoringService,
  ) {}

  async analyzePortfolio(
    portfolioId: number,
    period: '1M' | '3M' | '1Y' = '1Y',
    benchmarkCode = 'SP500',
    userId = 0,
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

    // ── 가격 데이터 보장 + stale 감지 ──
    const staleTickers: string[] = [];
    const priceStaleMap = new Map<number, boolean>(); // securityId → isStale (cache per analysis run)

    const ensurePrice = async (securityId: number, ticker: string): Promise<boolean> => {
      if (priceStaleMap.has(securityId)) return priceStaleMap.get(securityId)!;
      const isStale = await this.ensurePriceData(securityId, ticker);
      priceStaleMap.set(securityId, isStale);
      if (isStale) staleTickers.push(ticker);
      return isStale;
    };

    // ── 포트폴리오 수익률 계산 ──
    let portfolioReturn = 0;

    for (const item of items) {
      const isCash =
        item.security?.assetType === 'CASH' ||
        item.security?.ticker?.toUpperCase() === 'CASH';

      if (isCash) continue; // 현금은 수익률 0으로 처리

      await ensurePrice(item.securityId, item.security?.ticker ?? '');

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
    // H3: 통화 단위 불일치 의심 종목 (returnPct > 900% or < -99.9%)
    const currencyWarnings: string[] = [];
    const RETURN_SANITY_PCT = 900;

    for (const item of items) {
      if (!item.avgCost || Number(item.avgCost) <= 0) continue;

      await ensurePrice(item.securityId, item.security?.ticker ?? '');

      const prices = await this.priceDailyRepository.find({
        where: { securityId: item.securityId },
        order: { tradeDate: 'DESC' },
        take: 1,
      });

      if (prices.length > 0) {
        const currentPrice = Number(prices[0].close);
        const cost = Number(item.avgCost);
        const returnPct = ((currentPrice - cost) / cost) * 100;

        // H3: currency unit mismatch detection
        // Case A: astronomical gain (e.g. USD avgCost entered as 0.10 for a $175 stock)
        // Case B: KRW avgCost entered for a US stock (e.g. avgCost=230000 vs currentPrice=175 → cost is ~1300x)
        const ticker = item.security?.ticker ?? '';
        const isUSStock = !ticker.endsWith('.KS') && !ticker.endsWith('.KQ');
        const likelyCurrencyMismatch =
          Math.abs(returnPct) > RETURN_SANITY_PCT ||
          (isUSStock && cost > currentPrice * 500);
        if (likelyCurrencyMismatch) {
          this.logger.warn(`[CURRENCY-CHECK] ${ticker}: returnPct=${returnPct.toFixed(0)}% cost=${cost} close=${currentPrice} isUS=${isUSStock} — 통화 불일치 의심, 수익률 제외`);
          currencyWarnings.push(ticker);
          continue;
        }

        personalReturns.push({
          ticker,
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
      hasStaleData: staleTickers.length > 0,
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

    // ── baseline 조회 (첫 스냅샷 기준 비교용) ──
    const baselineItems = userId > 0
      ? await this.historyService.getBaselineItems(portfolioId, userId)
      : null;

    // ── 사용자 프로필 조회 (리밸런스 개인화 + trial 체크 공용) ──
    let userRow: import('../entities/user.entity').User | null = null;
    if (userId > 0) {
      const { User } = await import('../entities/user.entity');
      userRow = await this.portfolioRepository.manager.findOne(User, { where: { id: userId } });
    }

    // ── 리밸런싱 엔진 ──
    const rebalanceResult = computeRebalance({
      items: itemMetas,
      currentScore: diversificationScore,
      sectorExposure,
      baselineItems: baselineItems ?? undefined,
      userProfile: userRow ? {
        investorStyle: userRow.investorStyle ?? undefined,
        marketPref: userRow.marketPref ?? undefined,
        productPref: userRow.productPref ?? undefined,
      } : undefined,
    });

    // ── 스냅샷 저장 + 히스토리 조회 ──
    if (userId > 0) {
      await this.historyService.saveSnapshot({
        portfolioId,
        userId,
        healthScore,
        diversificationScore,
        portfolioReturn: Number(portfolioReturn.toFixed(2)),
        benchmarkReturn: Number(benchmarkReturn.toFixed(2)),
        top3Concentration: Number(top3Concentration.toFixed(2)),
        maxSectorWeight: Number(maxSectorWeight.toFixed(2)),
        maxSectorName,
        portfolioStyle,
        sectorExposure,
        warnings,
        items: itemMetas.map((i) => ({ ...i, name: i.name ?? i.ticker })),
      });

      const rebalanceImprovement = rebalanceResult
        ? rebalanceResult.improvedScore - rebalanceResult.currentScore
        : 0;
      this.monitoringService.detectAfterAnalysis(portfolioId, userId, {
        healthScore,
        diversificationScore,
        top3Concentration: Number(top3Concentration.toFixed(2)),
        maxSectorWeight: Number(maxSectorWeight.toFixed(2)),
        maxSectorName,
        items: itemMetas.map((i) => ({
          ticker: i.ticker,
          name: i.name ?? i.ticker,
          weight: i.weight,
          assetType: i.assetType ?? 'STOCK',
        })),
      }, rebalanceImprovement).catch((err) =>
        this.logger.warn(`Monitoring detection failed: ${err}`),
      );
      this.monitoringService.computeAndSaveState(portfolioId, userId, {
        healthScore,
        diversScore: diversificationScore,
        top3Concentration: Number(top3Concentration.toFixed(2)),
        maxSectorWeight: Number(maxSectorWeight.toFixed(2)),
        maxSectorName,
        items: itemMetas.map((i) => ({
          ticker: i.ticker,
          weight: i.weight,
          assetType: i.assetType ?? 'STOCK',
        })),
      }).catch((err) => this.logger.warn(`State compute failed: ${err}`));
    }

    const history = userId > 0
      ? await this.historyService.getHistory(portfolioId, userId)
      : { trend: [], alerts: [], change: null };

    const billingMode = await this.adminService.getBillingMode();

    // 트라이얼 체크 (userRow는 위에서 이미 조회됨)
    let isTrial = false;
    let trialEndsAt: Date | null = null;
    if (userRow?.trialEndsAt && new Date(userRow.trialEndsAt) > new Date()) {
      isTrial = true;
      trialEndsAt = userRow.trialEndsAt;
    }

    let isPremium: boolean;
    if (billingMode === 'FREE' || isTrial || billingMode === 'SOFT_PAYWALL') {
      isPremium = true;
    } else {
      // PAID: 포트폴리오별 결제 여부 확인
      isPremium = userId > 0
        ? await this.paymentsService.isUnlocked(portfolioId, userId)
        : false;
    }

    // 상대 순위 (분산도 기준) — 최근 스냅샷들과 비교
    const diversificationPercentile = await this.computePercentile(diversificationScore);

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
      history,
      isPremium,
      isTrial,
      trialEndsAt,
      diversificationPercentile,
      hasStalePrices: staleTickers.length > 0,
      staleTickers,
      currencyWarnings,
    };
  }

  /** 분산도 점수 기준 상위 몇 % 인지 반환 (스냅샷 전체 비교) */
  private async computePercentile(score: number): Promise<number> {
    try {
      const result = await this.portfolioRepository.manager.query(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN diversificationScore < ? THEN 1 ELSE 0 END) AS below
         FROM (
           SELECT diversificationScore FROM portfolio_snapshots
           GROUP BY portfolioId ORDER BY NULL
         ) t`,
        [score],
      );
      const total = Number(result[0]?.total ?? 0);
      const below = Number(result[0]?.below ?? 0);
      if (total < 5) return 0; // 데이터 부족 시 표시 안 함
      return Math.round((below / total) * 100);
    } catch {
      return 0;
    }
  }

  /** 가격 데이터를 보장하고 stale 여부를 반환 (true = stale / 데이터 없음) */
  private async ensurePriceData(securityId: number, ticker: string): Promise<boolean> {
    const STALE_DAYS = 14; // 14 calendar days without new data = stale

    const existing = await this.priceDailyRepository.findOne({
      where: { securityId },
      order: { tradeDate: 'DESC' },
    });

    if (existing) {
      const lastDate = new Date(existing.tradeDate);
      const daysDiff = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff <= STALE_DAYS) return false; // fresh

      // Stale — try incremental refresh
      this.logger.log(`[STALE] ${ticker} 마지막 가격이 ${Math.floor(daysDiff)}일 전 → 갱신 시도`);
      try {
        const period1 = new Date(existing.tradeDate);
        period1.setDate(period1.getDate() + 1);
        const period2 = new Date();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any[] = await yf.historical(ticker, { period1, period2 });
        if (result && result.length > 0) {
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
          this.logger.log(`[STALE-REFRESH] ${ticker} — ${rows.length}건 갱신`);
          return false; // refreshed
        }
      } catch (e) {
        this.logger.error(`[STALE-REFRESH] ${ticker} 실패: ${e}`);
      }
      return true; // still stale after refresh attempt
    }

    // No data at all — fetch full 1-year history
    try {
      this.logger.log(`[AUTO-FETCH] ${ticker} 가격 데이터 없음 → yfinance 수집 시작`);
      const period1 = new Date();
      period1.setFullYear(period1.getFullYear() - 1);
      const period2 = new Date();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any[] = await yf.historical(ticker, { period1, period2 });
      if (!result || result.length === 0) {
        this.logger.warn(`[AUTO-FETCH] ${ticker} — 데이터 없음`);
        return true;
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
      return false;
    } catch (e) {
      this.logger.error(`[AUTO-FETCH] ${ticker} 실패: ${e}`);
      return true;
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

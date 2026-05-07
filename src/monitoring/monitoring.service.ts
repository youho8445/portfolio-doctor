import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { PortfolioStateEvent } from '../entities/portfolio-state-event.entity';
import { PortfolioSnapshot } from '../entities/portfolio-snapshot.entity';
import { Portfolio } from '../entities/portfolio.entity';
import { PortfolioItem } from '../entities/portfolio-item.entity';
import { PriceDaily } from '../entities/price-daily.entity';
import { Benchmark } from '../entities/benchmark.entity';
import { BenchmarkPriceDaily } from '../entities/benchmark-price-daily.entity';
import { PortfolioState } from '../entities/portfolio-state.entity';
import { PushService } from '../push/push.service';
import { detectStateChanges, SnapshotState } from './state-change-detector';
import { calculateState, StateInput } from './portfolio-state.calculator';
import { computeScore } from '../analysis/score.engine';
import { computeInsights } from '../analysis/insights.engine';
import { computeRebalance } from '../analysis/rebalance.engine';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    @InjectRepository(PortfolioStateEvent)
    private readonly eventRepo: Repository<PortfolioStateEvent>,
    @InjectRepository(PortfolioSnapshot)
    private readonly snapshotRepo: Repository<PortfolioSnapshot>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepo: Repository<Portfolio>,
    @InjectRepository(PortfolioItem)
    private readonly portfolioItemRepo: Repository<PortfolioItem>,
    @InjectRepository(PriceDaily)
    private readonly priceDailyRepo: Repository<PriceDaily>,
    @InjectRepository(Benchmark)
    private readonly benchmarkRepo: Repository<Benchmark>,
    @InjectRepository(BenchmarkPriceDaily)
    private readonly benchmarkPriceRepo: Repository<BenchmarkPriceDaily>,
    @InjectRepository(PortfolioState)
    private readonly stateRepo: Repository<PortfolioState>,
    private readonly pushService: PushService,
  ) {}

  // Called immediately after a user-triggered analysis + snapshot save
  async detectAfterAnalysis(
    portfolioId: number,
    userId: number,
    current: SnapshotState,
    rebalanceImprovement: number,
  ): Promise<void> {
    const stateWithImprovement: SnapshotState = { ...current, rebalanceImprovement };

    const previous = await this.getPreviousSnapshot(portfolioId, userId);
    if (!previous) return;

    await this.saveNewEvents(portfolioId, userId, stateWithImprovement, previous);
  }

  // Daily cron at 9AM KST (= 0AM UTC)
  @Cron('0 0 * * *')
  async runDailyDetection(): Promise<void> {
    this.logger.log('Running daily portfolio state detection...');

    const portfolios = await this.portfolioRepo.find();
    for (const portfolio of portfolios) {
      try {
        await this.runDailyCheckForPortfolio(portfolio);
      } catch (err) {
        this.logger.warn(`Detection failed for portfolio ${portfolio.id}: ${err}`);
      }
    }

    this.logger.log('Daily detection complete.');
  }

  private async runDailyCheckForPortfolio(portfolio: Portfolio): Promise<void> {
    const lastSnapshot = await this.snapshotRepo.findOne({
      where: { portfolioId: portfolio.id, userId: portfolio.userId },
      order: { createdAt: 'DESC' },
    });

    if (!lastSnapshot) return;

    const items = await this.portfolioItemRepo.find({
      where: { portfolioId: portfolio.id },
      relations: ['security'],
    });

    if (!items.length) return;

    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const startDateStr = startDate.toISOString().slice(0, 10);

    // 포트폴리오 수익률 (price_daily 기준)
    let portfolioReturn = 0;
    for (const item of items) {
      const isCash = item.security?.assetType === 'CASH' || item.security?.ticker?.toUpperCase() === 'CASH';
      if (isCash) continue;

      const prices = await this.priceDailyRepo.find({
        where: { securityId: item.securityId, tradeDate: MoreThanOrEqual(startDateStr) },
        order: { tradeDate: 'ASC' },
      });

      if (prices.length >= 2) {
        const first = Number(prices[0].close);
        const last = Number(prices[prices.length - 1].close);
        portfolioReturn += (Number(item.weight) / 100) * ((last - first) / first) * 100;
      }
    }

    // 벤치마크 수익률
    const sp500 = await this.benchmarkRepo.findOne({ where: { code: 'SP500' } });
    let benchmarkReturn = 0;
    if (sp500) {
      const bPrices = await this.benchmarkPriceRepo.find({
        where: { benchmarkId: sp500.id, tradeDate: MoreThanOrEqual(startDateStr) },
        order: { tradeDate: 'ASC' },
      });
      if (bPrices.length >= 2) {
        const first = Number(bPrices[0].close);
        const last = Number(bPrices[bPrices.length - 1].close);
        benchmarkReturn = ((last - first) / first) * 100;
      }
    }

    // 집중도 / 섹터 계산
    const sortedWeights = items.map((i) => Number(i.weight)).sort((a, b) => b - a);
    const top3Concentration = sortedWeights.slice(0, 3).reduce((s, v) => s + v, 0);

    const sectorMap: Record<string, number> = {};
    for (const item of items) {
      const isCash = item.security?.assetType === 'CASH' || item.security?.ticker?.toUpperCase() === 'CASH';
      const isEtf = item.security?.assetType === 'ETF';
      const sector = isCash ? 'Cash' : isEtf ? 'ETF' : (item.security?.sector ?? 'Unknown');
      sectorMap[sector] = (sectorMap[sector] ?? 0) + Number(item.weight);
    }

    const sectorExposure = Object.entries(sectorMap)
      .map(([sector, weight]) => ({ sector, weight }))
      .sort((a, b) => b.weight - a.weight);

    const scorableSectors = sectorExposure.filter((s) => s.sector !== 'Cash' && s.sector !== 'ETF');
    const maxSectorWeight = scorableSectors[0]?.weight ?? 0;
    const maxSectorName = scorableSectors[0]?.sector ?? '';

    const itemMetas = items.map((i) => ({
      ticker: i.security?.ticker ?? '',
      name: i.security?.displayNameKo || i.security?.name || i.security?.ticker || '',
      weight: Number(i.weight),
      sector: i.security?.sector ?? 'Unknown',
      assetType: i.security?.assetType ?? 'STOCK',
    }));

    const { healthScore } = computeScore({
      items: itemMetas,
      top3Concentration,
      maxSectorWeight,
      maxSectorName,
      portfolioReturn,
      benchmarkReturn,
    });

    const { diversificationScore } = computeInsights({
      items: itemMetas,
      top3Concentration,
      sectorExposure,
      portfolioReturn,
      benchmarkReturn,
    });

    const rebalanceResult = computeRebalance({
      items: itemMetas,
      currentScore: diversificationScore,
      sectorExposure,
    });

    const rebalanceImprovement = rebalanceResult
      ? rebalanceResult.improvedScore - rebalanceResult.currentScore
      : 0;

    const current: SnapshotState = {
      healthScore,
      diversificationScore,
      top3Concentration: Number(top3Concentration.toFixed(2)),
      maxSectorWeight: Number(maxSectorWeight.toFixed(2)),
      maxSectorName,
      items: itemMetas.map((i) => ({
        ticker: i.ticker,
        name: i.name ?? i.ticker,
        weight: i.weight,
        assetType: i.assetType,
      })),
      rebalanceImprovement,
    };

    const previous = this.snapshotToState(lastSnapshot);
    await this.saveNewEvents(portfolio.id, portfolio.userId, current, previous);
  }

  async getUserEvents(userId: number): Promise<PortfolioStateEvent[]> {
    return this.eventRepo.find({
      where: { userId },
      order: { detectedAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(id: number, userId: number): Promise<void> {
    await this.eventRepo.update({ id, userId }, { isRead: true });
  }

  async markAllRead(userId: number): Promise<void> {
    await this.eventRepo.update({ userId, isRead: false }, { isRead: true });
  }

  async getPortfolioEvents(portfolioId: number, userId: number): Promise<PortfolioStateEvent[]> {
    return this.eventRepo.find({
      where: { portfolioId, userId },
      order: { detectedAt: 'DESC' },
      take: 20,
    });
  }

  async computeAndSaveState(portfolioId: number, userId: number, input: StateInput): Promise<void> {
    const previous = await this.stateRepo.findOne({
      where: { portfolioId },
      order: { changedAt: 'DESC' },
    });

    const result = calculateState(input, previous ?? undefined);

    const entity = this.stateRepo.create({
      portfolioId,
      userId,
      state: result.state,
      healthScore: input.healthScore,
      diversScore: input.diversScore,
      top3Concentration: input.top3Concentration,
      maxSectorWeight: input.maxSectorWeight,
      maxSectorName: input.maxSectorName,
      reason: result.reason,
      changedAt: new Date(),
    });

    await this.stateRepo.save(entity);
  }

  async getCurrentState(portfolioId: number, userId: number) {
    const latest = await this.stateRepo.findOne({
      where: { portfolioId, userId },
      order: { changedAt: 'DESC' },
    });

    if (!latest) return null;

    const [previous] = await this.stateRepo.find({
      where: { portfolioId, userId },
      order: { changedAt: 'DESC' },
      skip: 1,
      take: 1,
    });

    let trend: 'up' | 'down' | 'same' = 'same';
    if (previous) {
      const delta = Number(latest.healthScore) - Number(previous.healthScore);
      if (delta > 2) trend = 'up';
      else if (delta < -2) trend = 'down';
    }

    return {
      state: latest.state,
      reason: latest.reason,
      trend,
      metrics: {
        healthScore: Number(latest.healthScore),
        diversScore: Number(latest.diversScore),
        top3Concentration: Number(latest.top3Concentration),
        maxSectorWeight: Number(latest.maxSectorWeight),
        maxSectorName: latest.maxSectorName,
      },
      changedAt: latest.changedAt,
    };
  }

  private async getPreviousSnapshot(portfolioId: number, userId: number): Promise<SnapshotState | null> {
    // Get 2nd-latest snapshot (the one before the just-saved one)
    const snapshots = await this.snapshotRepo.find({
      where: { portfolioId, userId },
      order: { createdAt: 'DESC' },
      take: 2,
    });

    if (snapshots.length < 2) return null;
    return this.snapshotToState(snapshots[1]);
  }

  private snapshotToState(snapshot: PortfolioSnapshot): SnapshotState {
    let items: SnapshotState['items'] | undefined;
    if (snapshot.itemsJson) {
      try {
        items = JSON.parse(snapshot.itemsJson);
      } catch { /* ignore */ }
    }

    return {
      healthScore: Number(snapshot.healthScore),
      diversificationScore: Number(snapshot.diversificationScore),
      top3Concentration: Number(snapshot.top3Concentration),
      maxSectorWeight: Number(snapshot.maxSectorWeight),
      maxSectorName: snapshot.maxSectorName,
      items,
    };
  }

  private async saveNewEvents(
    portfolioId: number,
    userId: number,
    current: SnapshotState,
    previous: SnapshotState,
  ): Promise<void> {
    const detectedEvents = detectStateChanges(current, previous);
    if (!detectedEvents.length) return;

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    for (const event of detectedEvents) {
      const duplicate = await this.eventRepo.findOne({
        where: {
          portfolioId,
          eventType: event.eventType,
          detectedAt: MoreThanOrEqual(todayMidnight),
        },
      });

      if (duplicate) continue;

      const entity = this.eventRepo.create({
        userId,
        portfolioId,
        eventType: event.eventType,
        title: event.title,
        message: event.message,
        severity: event.severity,
        metadataJson: event.metadataJson ?? null,
        impactBody: event.impactBody ?? null,
        actionType: event.actionType ?? null,
        actionLabel: event.actionLabel ?? null,
        isPremiumFeature: event.isPremiumFeature ?? false,
        isRead: false,
        detectedAt: new Date(),
      });

      await this.eventRepo.save(entity);

      // Web Push 발송 (구독자가 없거나 VAPID 미설정이면 no-op)
      this.pushService.sendToUser(userId, event.title, event.message, {
        eventType: event.eventType,
        portfolioId,
        severity: event.severity,
      }).catch((err) => this.logger.warn(`Push send failed: ${err}`));
    }
  }
}

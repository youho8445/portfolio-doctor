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
import { User } from '../entities/user.entity';
import { PushService } from '../push/push.service';
import { AdminService } from '../admin/admin.service';
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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly pushService: PushService,
    private readonly adminService: AdminService,
  ) {}

  // Called immediately after a user-triggered analysis.
  // Saves today's snapshot and fires events if state changed since last snapshot.
  async detectAfterAnalysis(
    portfolioId: number,
    userId: number,
    current: SnapshotState,
    rebalanceImprovement: number,
  ): Promise<void> {
    const stateWithImprovement: SnapshotState = { ...current, rebalanceImprovement };

    // Capture previous state BEFORE saving the new snapshot
    const lastSnapshot = await this.snapshotRepo.findOne({
      where: { portfolioId, userId },
      order: { createdAt: 'DESC' },
    });

    const portfolio = await this.portfolioRepo.findOne({ where: { id: portfolioId, userId } });
    if (!portfolio) return;

    // Save today's snapshot (at most once per day)
    await this.saveSnapshotIfNeeded(portfolio, stateWithImprovement);

    // First run — baseline saved, no events
    if (!lastSnapshot) return;

    const previous = this.snapshotToState(lastSnapshot);
    await this.saveNewEvents(portfolioId, userId, stateWithImprovement, previous);
  }

  // ─── Internal polling crons (KST times) ───────────────────────────────────
  // These are implementation details — user-facing value is condition-based alerts.

  @Cron('30 0 * * *') // KST 09:30 — KR open
  async krOpen(): Promise<void> { await this.runChecksForMarket('KR'); }

  @Cron('0 3 * * *')  // KST 12:00 — KR midday
  async krMid(): Promise<void> { await this.runChecksForMarket('KR'); }

  @Cron('20 6 * * *') // KST 15:20 — KR pre-close
  async krClose(): Promise<void> { await this.runChecksForMarket('KR'); }

  @Cron('30 14 * * *') // KST 23:30 — US open
  async usOpen(): Promise<void> { await this.runChecksForMarket('US'); }

  @Cron('0 17 * * *')  // KST 02:00 — US midday
  async usMid(): Promise<void> { await this.runChecksForMarket('US'); }

  @Cron('30 20 * * *') // KST 05:30 — US pre-close
  async usClose(): Promise<void> { await this.runChecksForMarket('US'); }

  // ─── Public: admin / testing ──────────────────────────────────────────────

  async runAllChecksNow(): Promise<number> {
    const portfolios = await this.portfolioRepo.find();
    for (const portfolio of portfolios) {
      try {
        await this.runCheckForPortfolio(portfolio);
      } catch (err) {
        this.logger.warn(`Manual check failed for portfolio ${portfolio.id}: ${err}`);
      }
    }
    return portfolios.length;
  }

  // ─── Core detection loop ──────────────────────────────────────────────────

  private async runChecksForMarket(market: 'KR' | 'US'): Promise<void> {
    this.logger.log(`Running ${market} market portfolio state detection...`);

    const portfolios = await this.portfolioRepo.find();
    let checked = 0;

    for (const portfolio of portfolios) {
      try {
        const items = await this.portfolioItemRepo.find({
          where: { portfolioId: portfolio.id },
          relations: ['security'],
        });

        const hasMarket = items.some((i) => {
          const country = i.security?.country?.toUpperCase() ?? '';
          if (market === 'KR') return country === 'KR';
          if (market === 'US') return country === 'US' || country === '';
          return false;
        });

        // Cash-only or unknown country → KR schedule by default
        const isAllCashOrUnknown = items.every(
          (i) => i.security?.assetType === 'CASH' || i.security?.ticker?.toUpperCase() === 'CASH',
        );
        if (!hasMarket && !(market === 'KR' && isAllCashOrUnknown)) continue;

        await this.runCheckForPortfolio(portfolio, items);
        checked++;
      } catch (err) {
        this.logger.warn(`Detection failed for portfolio ${portfolio.id}: ${err}`);
      }
    }

    this.logger.log(`${market} detection complete — checked ${checked} portfolios.`);
  }

  private async runCheckForPortfolio(
    portfolio: Portfolio,
    preloadedItems?: PortfolioItem[],
  ): Promise<void> {
    const items = preloadedItems ?? await this.portfolioItemRepo.find({
      where: { portfolioId: portfolio.id },
      relations: ['security'],
    });

    if (!items.length) return;

    const lastSnapshot = await this.snapshotRepo.findOne({
      where: { portfolioId: portfolio.id, userId: portfolio.userId },
      order: { createdAt: 'DESC' },
    });

    const current = await this.computeCurrentState(portfolio.id, items);

    // Save today's snapshot (at most once per day)
    await this.saveSnapshotIfNeeded(portfolio, current);

    // First run: baseline saved, no events
    if (!lastSnapshot) {
      this.logger.log(`Baseline snapshot created for portfolio ${portfolio.id}`);
      return;
    }

    const previous = this.snapshotToState(lastSnapshot);
    await this.saveNewEvents(portfolio.id, portfolio.userId, current, previous);
  }

  private async computeCurrentState(
    portfolioId: number,
    items: PortfolioItem[],
  ): Promise<SnapshotState> {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const startDateStr = startDate.toISOString().slice(0, 10);

    // Portfolio return from price_daily
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

    // Benchmark return (SP500)
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

    // Concentration + sector metrics
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

    return {
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
  }

  // Saves a snapshot for today if one doesn't already exist for this portfolio.
  // Keeps at most one snapshot per day (used as the comparison baseline for the next check).
  private async saveSnapshotIfNeeded(portfolio: Portfolio, state: SnapshotState): Promise<void> {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const existingToday = await this.snapshotRepo.findOne({
      where: {
        portfolioId: portfolio.id,
        userId: portfolio.userId,
        createdAt: MoreThanOrEqual(todayMidnight),
      },
    });
    if (existingToday) return;
    await this.saveBaselineSnapshot(portfolio, state);
  }

  private async saveBaselineSnapshot(portfolio: Portfolio, state: SnapshotState): Promise<void> {
    const entity = this.snapshotRepo.create({
      portfolioId: portfolio.id,
      userId: portfolio.userId,
      healthScore: state.healthScore,
      diversificationScore: state.diversificationScore,
      top3Concentration: state.top3Concentration,
      maxSectorWeight: state.maxSectorWeight,
      maxSectorName: state.maxSectorName,
      portfolioReturn: 0,
      benchmarkReturn: 0,
      itemsJson: state.items ? JSON.stringify(state.items) : undefined,
    });
    await this.snapshotRepo.save(entity);
  }

  // ─── User-facing query methods ────────────────────────────────────────────

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

  async deleteAllEvents(userId: number): Promise<void> {
    await this.eventRepo.delete({ userId });
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

    // Latest event time — used to show "마지막 변화 감지" in UI
    const latestEvent = await this.eventRepo.findOne({
      where: { portfolioId, userId },
      order: { detectedAt: 'DESC' },
    });

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
      lastEventDetectedAt: latestEvent?.detectedAt ?? null,
    };
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  private async getPreviousSnapshot(portfolioId: number, userId: number): Promise<SnapshotState | null> {
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

      const [billingMode, user] = await Promise.all([
        this.adminService.getBillingMode(),
        this.userRepo.findOne({ where: { id: userId } }),
      ]);
      const isTrial = user?.trialEndsAt != null && user.trialEndsAt > new Date();
      const canPush = billingMode === 'FREE' || billingMode === 'SOFT_PAYWALL' || isTrial;
      if (!canPush) continue;

      this.pushService.sendToUser(userId, event.title, event.message, {
        eventType: event.eventType,
        portfolioId,
        severity: event.severity,
      }).catch((err) => this.logger.warn(`Push send failed: ${err}`));
    }
  }
}

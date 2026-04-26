import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { PortfolioStateEvent } from '../entities/portfolio-state-event.entity';
import { PortfolioSnapshot } from '../entities/portfolio-snapshot.entity';
import { Portfolio } from '../entities/portfolio.entity';
import { PushService } from '../push/push.service';
import { detectStateChanges, SnapshotState } from './state-change-detector';

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
        const snapshots = await this.snapshotRepo.find({
          where: { portfolioId: portfolio.id, userId: portfolio.userId },
          order: { createdAt: 'DESC' },
          take: 2,
        });

        if (snapshots.length < 2) continue;

        const [latest, previous] = snapshots;
        const current = this.snapshotToState(latest);
        const prev = this.snapshotToState(previous);

        await this.saveNewEvents(portfolio.id, portfolio.userId, current, prev);
      } catch (err) {
        this.logger.warn(`Detection failed for portfolio ${portfolio.id}: ${err}`);
      }
    }

    this.logger.log('Daily detection complete.');
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

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioSnapshot } from '../entities/portfolio-snapshot.entity';
import { Portfolio } from '../entities/portfolio.entity';

export interface SnapshotItem {
  ticker: string;
  name: string;
  weight: number;
  sector: string;
  assetType: string;
}

export interface SnapshotInput {
  portfolioId: number;
  userId: number;
  healthScore: number;
  diversificationScore: number;
  portfolioReturn: number;
  benchmarkReturn: number;
  top3Concentration: number;
  maxSectorWeight: number;
  maxSectorName: string;
  portfolioStyle: string;
  sectorExposure: { sector: string; weight: number }[];
  warnings: string[];
  items: SnapshotItem[];
}

export interface HistoryChange {
  healthScoreDelta: number;
  diversificationScoreDelta: number;
  top3ConcentrationDelta: number;
}

export interface HistoryResult {
  trend: { date: Date; healthScore: number; diversificationScore: number }[];
  alerts: string[];
  change: HistoryChange | null;
}

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(PortfolioSnapshot)
    private readonly snapshotRepo: Repository<PortfolioSnapshot>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepo: Repository<Portfolio>,
  ) {}

  async saveSnapshot(input: SnapshotInput): Promise<void> {
    const snapshot = this.snapshotRepo.create({
      portfolioId: input.portfolioId,
      userId: input.userId,
      healthScore: input.healthScore,
      diversificationScore: input.diversificationScore,
      portfolioReturn: input.portfolioReturn,
      benchmarkReturn: input.benchmarkReturn,
      top3Concentration: input.top3Concentration,
      maxSectorWeight: input.maxSectorWeight,
      maxSectorName: input.maxSectorName,
      portfolioStyle: input.portfolioStyle,
      sectorExposureJson: JSON.stringify(input.sectorExposure),
      warningsJson: JSON.stringify(input.warnings),
      itemsJson: JSON.stringify(input.items),
    });
    await this.snapshotRepo.save(snapshot);
  }

  async getBaselineItems(portfolioId: number, userId: number): Promise<SnapshotItem[] | null> {
    const oldest = await this.snapshotRepo.findOne({
      where: { portfolioId, userId },
      order: { createdAt: 'ASC' },
    });
    if (!oldest?.itemsJson) return null;
    try {
      return JSON.parse(oldest.itemsJson) as SnapshotItem[];
    } catch {
      return null;
    }
  }

  async getHistory(portfolioId: number, userId: number): Promise<HistoryResult> {
    const portfolio = await this.portfolioRepo.findOne({ where: { id: portfolioId, userId } });
    if (!portfolio) throw new NotFoundException('Portfolio not found');

    const snapshots = await this.snapshotRepo.find({
      where: { portfolioId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    if (snapshots.length === 0) return { trend: [], alerts: [], change: null };

    const alerts: string[] = [];
    if (snapshots.length >= 2) {
      const a = snapshots[0];
      const b = snapshots[1];

      const hDelta = Number(a.healthScore) - Number(b.healthScore);
      const dDelta = Number(a.diversificationScore) - Number(b.diversificationScore);
      const cDelta = Number(a.top3Concentration) - Number(b.top3Concentration);
      const sDelta = Number(a.maxSectorWeight) - Number(b.maxSectorWeight);

      if (hDelta <= -10)
        alerts.push(`포트폴리오 건강 점수가 ${Math.abs(Math.round(hDelta))}점 하락했습니다`);
      if (dDelta <= -10)
        alerts.push(`분산도가 낮아졌습니다. 리밸런싱을 권장합니다`);
      if (cDelta >= 10)
        alerts.push(`상위 3종목 집중도가 ${cDelta.toFixed(1)}%p 높아졌습니다`);
      if (sDelta >= 15)
        alerts.push(`${a.maxSectorName} 섹터 집중도가 높아졌습니다 (${Number(b.maxSectorWeight).toFixed(1)}% → ${Number(a.maxSectorWeight).toFixed(1)}%)`);
    }

    const latest = snapshots[0];
    const previous = snapshots.length >= 2 ? snapshots[1] : null;

    const change: HistoryChange | null = previous
      ? {
          healthScoreDelta: Math.round(Number(latest.healthScore) - Number(previous.healthScore)),
          diversificationScoreDelta: Math.round(
            Number(latest.diversificationScore) - Number(previous.diversificationScore),
          ),
          top3ConcentrationDelta:
            Math.round((Number(latest.top3Concentration) - Number(previous.top3Concentration)) * 10) / 10,
        }
      : null;

    const trend = [...snapshots]
      .reverse()
      .map((s) => ({
        date: s.createdAt,
        healthScore: Number(s.healthScore),
        diversificationScore: Number(s.diversificationScore),
      }));

    return { trend, alerts, change };
  }
}

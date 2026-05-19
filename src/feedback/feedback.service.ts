import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../entities/feedback.entity';

const HELPFUL_REASONS = [
  '건강 점수가 직관적이었어요',
  '위험 신호를 쉽게 이해했어요',
  '리밸런싱 방향이 도움이 됐어요',
  '내 포트폴리오를 다시 보게 됐어요',
  '용어 설명이 좋았어요',
  '알림 기능이 유용해 보여요',
] as const;

const NEGATIVE_REASONS = [
  '분석 이유가 이해하기 어려웠어요',
  '리밸런싱 제안이 너무 뻔했어요',
  'ETF 추천이 많았어요',
  '내 투자 성향이 반영되지 않은 것 같아요',
  '용어가 어려웠어요',
  '화면이 복잡했어요',
  '원하는 종목/시장이 없었어요',
  '알림 기능이 잘 이해되지 않았어요',
  '기타',
] as const;

export const ALLOWED_REASONS = [...HELPFUL_REASONS, ...NEGATIVE_REASONS] as string[];

export const VALID_RATINGS = ['helpful', 'unclear', 'not_helpful'] as const;
export const VALID_PAGES = ['analysis_result', 'rebalance_gate', 'notification_setup'] as const;

export interface SubmitFeedbackDto {
  userId: number | null;
  sessionId?: string | null;
  analysisId?: string | null;
  page: string;
  rating: string;
  reasons?: string[] | null;
  message?: string | null;
  healthScore?: number | null;
  isGuest: boolean;
}

export interface FeedbackSummary {
  total: number;
  byRating: { helpful: number; unclear: number; not_helpful: number };
  percentages: { helpful: number; unclear: number; not_helpful: number };
  topReasons: { reason: string; count: number }[];
  recentMessages: {
    id: number;
    rating: string;
    message: string;
    healthScore: number | null;
    isGuest: boolean;
    createdAt: string;
  }[];
  guestVsLoggedIn: { guest: number; loggedIn: number };
  avgHealthScore: number | null;
}

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly repo: Repository<Feedback>,
  ) {}

  async hasUserSubmitted(userId: number): Promise<boolean> {
    const row = await this.repo.findOne({ where: { userId } });
    return row !== null;
  }

  async submit(dto: SubmitFeedbackDto): Promise<void> {
    await this.repo.save(
      this.repo.create({
        userId: dto.userId,
        sessionId: dto.sessionId ?? null,
        analysisId: dto.analysisId ?? null,
        page: dto.page,
        rating: dto.rating,
        reasons: dto.reasons ?? null,
        message: dto.message ?? null,
        isGuest: dto.isGuest,
        healthScore: dto.healthScore ?? null,
      }),
    );
  }

  async getSummary(): Promise<FeedbackSummary> {
    const all = await this.repo.find({ order: { createdAt: 'DESC' } });
    const total = all.length;

    const byRating = { helpful: 0, unclear: 0, not_helpful: 0 };
    for (const f of all) {
      if (f.rating === 'helpful') byRating.helpful++;
      else if (f.rating === 'unclear') byRating.unclear++;
      else if (f.rating === 'not_helpful') byRating.not_helpful++;
    }

    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    const percentages = {
      helpful: pct(byRating.helpful),
      unclear: pct(byRating.unclear),
      not_helpful: pct(byRating.not_helpful),
    };

    const reasonMap: Record<string, number> = {};
    for (const f of all) {
      for (const r of f.reasons ?? []) {
        reasonMap[r] = (reasonMap[r] ?? 0) + 1;
      }
    }
    const topReasons = Object.entries(reasonMap)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentMessages = all
      .filter((f) => f.message && f.message.trim().length > 0)
      .slice(0, 20)
      .map((f) => ({
        id: f.id,
        rating: f.rating,
        message: f.message!,
        healthScore: f.healthScore !== null ? Number(f.healthScore) : null,
        isGuest: f.isGuest,
        createdAt: f.createdAt.toISOString(),
      }));

    const guest = all.filter((f) => f.isGuest).length;
    const loggedIn = all.filter((f) => !f.isGuest).length;

    const withScore = all.filter((f) => f.healthScore !== null);
    const avgHealthScore =
      withScore.length > 0
        ? Math.round(withScore.reduce((s, f) => s + Number(f.healthScore), 0) / withScore.length)
        : null;

    return { total, byRating, percentages, topReasons, recentMessages, guestVsLoggedIn: { guest, loggedIn }, avgHealthScore };
  }
}

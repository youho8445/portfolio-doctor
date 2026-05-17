import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { DailyContentNews } from '../entities/daily-content-news.entity';
import { fetchAllFeeds } from './rss-fetcher';
import { buildScoredItem, buildTickerSourceCounts } from './content-scorer';
import {
  generateWhyItMatters,
  generateOpeningHook,
  generateCaption,
  generateGlossaryTerms,
  generateHashtags,
  generateBeginnerCaution,
  generateScript15s,
  generateScript30s,
  generateSubtitleLines,
  generateCTA,
} from './content-templates';

const TOP_N = 5;

@Injectable()
export class ContentRadarService {
  private readonly logger = new Logger(ContentRadarService.name);
  private lastRefreshTriggeredAt: Date | null = null;
  private readonly REFRESH_COOLDOWN_MS = 10 * 60 * 1000;

  constructor(
    @InjectRepository(DailyContentNews)
    private readonly repo: Repository<DailyContentNews>,
  ) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  async getTodayItems(): Promise<{ items: DailyContentNews[]; refreshedAt: string | null; count: number }> {
    const items = await this.queryToday();
    const refreshedAt = items.length > 0 ? items[0].createdAt.toISOString() : null;
    return { items, refreshedAt, count: items.length };
  }

  async triggerRefresh(): Promise<{ message: string; triggeredAt: string }> {
    const now = new Date();
    if (
      this.lastRefreshTriggeredAt &&
      now.getTime() - this.lastRefreshTriggeredAt.getTime() < this.REFRESH_COOLDOWN_MS
    ) {
      const waitSec = Math.ceil(
        (this.REFRESH_COOLDOWN_MS - (now.getTime() - this.lastRefreshTriggeredAt.getTime())) / 1000,
      );
      return {
        message: `마지막 새로고침 후 ${waitSec}초 뒤 다시 시도해주세요.`,
        triggeredAt: now.toISOString(),
      };
    }
    this.lastRefreshTriggeredAt = now;
    void this.refresh();
    return { message: '수집을 시작했습니다.', triggeredAt: now.toISOString() };
  }

  async updateStatus(id: number, status: 'new' | 'used' | 'ignored'): Promise<DailyContentNews | null> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) return null;
    item.status = status;
    return this.repo.save(item);
  }

  // ── Refresh logic ──────────────────────────────────────────────────────────

  async refresh(): Promise<void> {
    this.logger.log('Content Radar refresh started');

    let rawItems: Awaited<ReturnType<typeof fetchAllFeeds>>;
    try {
      rawItems = await fetchAllFeeds();
    } catch (err) {
      this.logger.error('fetchAllFeeds threw unexpectedly', err);
      return;
    }

    if (rawItems.length === 0) {
      this.logger.warn('No items fetched from any RSS feed');
      return;
    }

    // Build cross-source ticker frequency for trendScore
    const tickerSourceCounts = buildTickerSourceCounts(rawItems);

    // Score and rank
    const scored = rawItems
      .map((r) => buildScoredItem(r, tickerSourceCounts))
      .sort((a, b) => b.contentScore - a.contentScore);

    // Dedup by URL against today's existing rows
    const existingToday = await this.queryToday();
    const existingUrls = new Set(existingToday.map((r) => r.url));

    let saved = 0;
    for (const item of scored) {
      if (saved >= TOP_N) break;
      if (existingUrls.has(item.url)) continue;

      const row = this.repo.create({
        title: item.title.slice(0, 299),
        source: item.source.slice(0, 99),
        url: item.url.slice(0, 499),
        publishedAt: item.publishedAt,
        market: item.market,
        category: item.category,
        relatedTickers: item.relatedTickers.length > 0 ? item.relatedTickers : null,
        // News content fields
        shortNewsSummary: (item.snippet || item.title).slice(0, 499),
        whyItMattersToPortfolio: generateWhyItMatters(item).slice(0, 499),
        beginnerCaution: generateBeginnerCaution(item).slice(0, 299),
        // Script fields
        openingHook: generateOpeningHook(item).slice(0, 299),
        script15s: generateScript15s(item).slice(0, 499),
        script30s: generateScript30s(item).slice(0, 999),
        subtitleLines: generateSubtitleLines(item),
        // Caption + metadata
        captionDraft: generateCaption(item).slice(0, 799),
        hashtags: generateHashtags(item),
        relatedGlossaryTerms: generateGlossaryTerms(item),
        ctaText: generateCTA(item).slice(0, 199),
        // Classification + scoring
        contentType: item.contentType,
        contentScore: item.contentScore,
        scoreTrend: item.scoreBreakdown.trend,
        scoreRelevance: item.scoreBreakdown.relevance,
        scoreBeginner: item.scoreBreakdown.beginner,
        scoreSource: item.scoreBreakdown.source,
        scorePenalty: item.scoreBreakdown.penalty,
        status: 'new',
      });

      try {
        await this.repo.save(row);
        saved++;
        existingUrls.add(item.url);
        this.logger.log(
          `Saved [${item.contentScore} T${item.scoreBreakdown.trend}+R${item.scoreBreakdown.relevance}+B${item.scoreBreakdown.beginner}+S${item.scoreBreakdown.source}-P${item.scoreBreakdown.penalty}] ${item.title.slice(0, 60)}`,
        );
      } catch (err) {
        this.logger.warn(`Failed to save item: ${err instanceof Error ? err.message : err}`);
      }
    }

    this.logger.log(`Content Radar refresh complete — ${saved} new items saved`);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async queryToday(): Promise<DailyContentNews[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return this.repo.find({
      where: { createdAt: Between(start, end) },
      order: { contentScore: 'DESC' },
      take: TOP_N,
    });
  }
}

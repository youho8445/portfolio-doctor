import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { DailyContentNews } from '../entities/daily-content-news.entity';
import { fetchAllFeeds } from './rss-fetcher';
import { buildScoredItem, buildTickerSourceCounts, ScoredItem } from './content-scorer';
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

  async triggerForceRefresh(): Promise<{ message: string; triggeredAt: string }> {
    const existing = await this.queryToday();
    if (existing.length > 0) {
      await this.repo.remove(existing);
      this.logger.log(`Force refresh: removed ${existing.length} today's items`);
    }
    this.lastRefreshTriggeredAt = null;
    void this.refresh();
    return { message: `오늘 항목 ${existing.length}개 삭제 후 재수집을 시작했습니다.`, triggeredAt: new Date().toISOString() };
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

    const slotsRemaining = Math.max(0, TOP_N - existingToday.length);
    if (slotsRemaining === 0) {
      this.logger.log('Content Radar refresh: TOP_N already filled for today');
      return;
    }

    // Filter out already-saved URLs, then apply diversity selection
    const newCandidates = scored.filter((item) => !existingUrls.has(item.url));
    const toSave = this.selectTopDiverse(newCandidates, slotsRemaining, existingToday);

    let saved = 0;
    for (const { item, reason } of toSave) {
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
        selectionReason: reason,
        status: 'new',
      });

      try {
        await this.repo.save(row);
        saved++;
        this.logger.log(
          `Saved [${item.contentScore} T${item.scoreBreakdown.trend}+R${item.scoreBreakdown.relevance}+B${item.scoreBreakdown.beginner}+S${item.scoreBreakdown.source}-P${item.scoreBreakdown.penalty}] [${reason}] ${item.title.slice(0, 60)}`,
        );
      } catch (err) {
        this.logger.warn(`Failed to save item: ${err instanceof Error ? err.message : err}`);
      }
    }

    this.logger.log(`Content Radar refresh complete — ${saved} new items saved`);
  }

  // ── Diversity selection ────────────────────────────────────────────────────

  // Groups articles by narrative theme so the same story isn't picked 4 times.
  // "주식 하락" × 4 all share 'bearish' cluster → only the highest-scored one passes.
  private getThemeCluster(item: ScoredItem): string {
    const text = `${item.title} ${item.snippet ?? ''}`;
    if (/파업|총파업/.test(text)) return 'strike';
    if (/FOMC/i.test(text)) return 'fomc';
    if (/CPI|소비자물가/.test(text)) return 'cpi';
    if (/금리\s*(인상|올리|높여)/.test(text)) return 'rate_hike';
    if (/금리\s*(인하|내리|낮춰|동결)/.test(text)) return 'rate_cut';
    if (/급락|폭락|하락세|매도/.test(text)) return 'bearish';
    if (/급등|폭등|상승세|신고가|돌파/.test(text)) return 'bullish';
    if (/환율|달러|원달러/.test(text)) return 'fx';
    if (/실적|어닝|영업이익/.test(text)) return 'earnings';
    if (/IPO|상장/.test(text)) return 'ipo';
    return item.category;
  }

  private selectTopDiverse(
    candidates: ScoredItem[],
    n: number,
    existingItems: DailyContentNews[] = [],
  ): Array<{ item: ScoredItem; reason: string }> {
    const MAX_PER_CATEGORY = 2;
    const MAX_PER_MARKET = 3;
    const MAX_PER_THEME = 1;

    const selected: Array<{ item: ScoredItem; reason: string }> = [];
    const usedTickers = new Set<string>();
    const categoryCounts = new Map<string, number>();
    const marketCounts = new Map<string, number>();
    const themeCounts = new Map<string, number>();

    // Pre-seed counts from items already saved today
    for (const ex of existingItems) {
      (ex.relatedTickers ?? []).forEach((t) => usedTickers.add(t));
      categoryCounts.set(ex.category, (categoryCounts.get(ex.category) ?? 0) + 1);
      marketCounts.set(ex.market, (marketCounts.get(ex.market) ?? 0) + 1);
    }

    const tryAdd = (item: ScoredItem, relaxed: boolean): boolean => {
      const tickers = item.relatedTickers ?? [];
      if (tickers.length > 0 && tickers.some((t) => usedTickers.has(t))) return false;
      if ((categoryCounts.get(item.category) ?? 0) >= MAX_PER_CATEGORY) return false;
      if (!relaxed && (marketCounts.get(item.market) ?? 0) >= MAX_PER_MARKET) return false;

      const theme = this.getThemeCluster(item);
      if (!relaxed && (themeCounts.get(theme) ?? 0) >= MAX_PER_THEME) return false;

      selected.push({ item, reason: this.computeSelectionReason(item) });
      tickers.forEach((t) => usedTickers.add(t));
      categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
      marketCounts.set(item.market, (marketCounts.get(item.market) ?? 0) + 1);
      themeCounts.set(theme, (themeCounts.get(theme) ?? 0) + 1);
      return true;
    };

    // Phase 1: strict diversity (ticker + category + market + theme caps)
    for (const item of candidates) {
      if (selected.length >= n) break;
      tryAdd(item, false);
    }

    // Phase 2: relax all caps if still underfilled (better some content than none)
    if (selected.length < n) {
      const selectedUrls = new Set(selected.map((s) => s.item.url));
      for (const item of candidates) {
        if (selected.length >= n) break;
        if (selectedUrls.has(item.url)) continue;
        tryAdd(item, true);
      }
    }

    return selected;
  }

  private computeSelectionReason(item: ScoredItem): string {
    const tickers = item.relatedTickers ?? [];
    const hasKR = tickers.some((t) => t.endsWith('.KS'));
    const hasUS = tickers.some((t) => !t.endsWith('.KS') && t.length <= 5);

    if (item.category === 'psychology') return '투자심리/FOMO 콘텐츠 적합';
    if (hasUS) return '미국 빅테크 이슈';
    if (hasKR) return '한국 투자자 관심 종목';
    if (item.category === 'macro' || item.category === 'fx') return '거시경제/금리 이슈';
    if (item.category === 'earnings') return '실적/포트폴리오 영향 높음';
    if (item.scoreBreakdown.relevance >= 20) return '포트폴리오 리스크 연결성 높음';
    return '포트폴리오 참고 소재';
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async queryToday(): Promise<DailyContentNews[]> {
    // Use KST (UTC+9) day boundaries so items saved at KST 06:00 (UTC prev-day 21:00)
    // don't disappear when UTC rolls past midnight at KST 09:00.
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const nowKst = new Date(Date.now() + KST_OFFSET_MS);
    const y = nowKst.getUTCFullYear();
    const m = nowKst.getUTCMonth();
    const d = nowKst.getUTCDate();
    const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - KST_OFFSET_MS);
    const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - KST_OFFSET_MS);
    return this.repo.find({
      where: { createdAt: Between(start, end) },
      order: { contentScore: 'DESC' },
      take: TOP_N,
    });
  }
}

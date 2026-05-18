import { Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

export interface RawNewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: Date | null;
  snippet: string;
}

interface FeedConfig {
  url: string;
  source: string;
  market: 'KR' | 'US' | 'GLOBAL';
}

// Korean-language sources only — English feeds (Yahoo Finance, Reuters, Investing.com)
// were removed because English articles require translation and are hard to use as content.
export const RSS_FEEDS: FeedConfig[] = [
  {
    url: 'https://www.yonhapnews.co.kr/rss/economy.xml',
    source: '연합뉴스',
    market: 'KR',
  },
  {
    url: 'https://www.hankyung.com/feed/finance',
    source: '한국경제',
    market: 'KR',
  },
  {
    url: 'https://www.mk.co.kr/rss/30100041/',
    source: '매일경제',
    market: 'KR',
  },
];

const logger = new Logger('RssFetcher');
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'item',
});

function parseDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

async function fetchOneFeed(feed: FeedConfig): Promise<RawNewsItem[]> {
  const res = await fetch(feed.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Pobalance/1.0; +https://pobalance.com)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const buffer = await res.arrayBuffer();

  // Detect charset from Content-Type or XML declaration; fall back to UTF-8
  const contentType = res.headers.get('content-type') ?? '';
  const charsetMatch = contentType.match(/charset=([^\s;]+)/i);
  const charset = charsetMatch?.[1]?.toLowerCase() ?? 'utf-8';

  let text: string;
  if (charset === 'euc-kr' || charset === 'ks_c_5601-1987') {
    // iconv-lite is a transitive dep of mysql2/NestJS, available at runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const iconv = require('iconv-lite') as { decode: (b: Buffer, enc: string) => string };
    text = iconv.decode(Buffer.from(buffer), 'euc-kr');
  } else {
    text = new TextDecoder('utf-8').decode(buffer);
  }

  // Also check XML declaration for encoding
  if (text.startsWith('<?xml') && text.includes('encoding="euc-kr"')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const iconv = require('iconv-lite') as { decode: (b: Buffer, enc: string) => string };
    text = iconv.decode(Buffer.from(buffer), 'euc-kr');
  }

  const parsed = parser.parse(text);
  const channel = parsed?.rss?.channel ?? parsed?.feed ?? {};
  const rawItems: unknown[] = Array.isArray(channel.item)
    ? channel.item
    : channel.item
      ? [channel.item]
      : [];

  return rawItems
    .slice(0, 20) // cap per feed to avoid processing noise
    .map((item: unknown) => {
      const it = item as Record<string, unknown>;
      const title = truncate(stripHtml(String(it.title ?? '')), 290);
      const url = String(it.link ?? it.guid ?? '');
      const raw = it.description ?? it.summary ?? it['content:encoded'] ?? '';
      const snippet = truncate(stripHtml(String(raw)), 490);
      const pubDate = parseDate(String(it.pubDate ?? it.published ?? it.updated ?? ''));
      return { title, url, source: feed.source, publishedAt: pubDate, snippet } as RawNewsItem;
    })
    .filter((item) => item.title.length > 5 && item.url.startsWith('http'));
}

export async function fetchAllFeeds(): Promise<(RawNewsItem & { market: 'KR' | 'US' | 'GLOBAL' })[]> {
  const results: (RawNewsItem & { market: 'KR' | 'US' | 'GLOBAL' })[] = [];
  let successCount = 0;

  for (const feed of RSS_FEEDS) {
    try {
      const items = await fetchOneFeed(feed);
      items.forEach((item) => results.push({ ...item, market: feed.market }));
      successCount++;
      logger.log(`✓ ${feed.source}: ${items.length} items`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`✗ ${feed.source} feed failed: ${msg}`);
    }
  }

  if (successCount === 0) {
    logger.warn('All RSS feeds failed — returning empty result');
  }

  return results;
}

import { RawNewsItem } from './rss-fetcher';

export type Market = 'KR' | 'US' | 'GLOBAL';
export type Category = 'earnings' | 'macro' | 'tech' | 'sector' | 'psychology' | 'fx' | 'other';
export type ContentType =
  | '경고형'
  | '공감형'
  | '설명형'
  | '용어풀이형'
  | '비교형'
  | '포트폴리오 점검형';

export interface ScoreBreakdown {
  trend: number;     // 0–25
  relevance: number; // 0–35
  beginner: number;  // 0–20
  source: number;    // 0–10
  penalty: number;   // 0–30 (stored positive; subtracted)
  final: number;     // 0–100
}

export interface ScoredItem extends RawNewsItem {
  market: Market;
  category: Category;
  contentType: ContentType;
  relatedTickers: string[];
  contentScore: number;
  scoreBreakdown: ScoreBreakdown;
}

// ── Priority ticker lists ──────────────────────────────────────────────────

const KR_TICKERS: Record<string, string> = {
  '삼성전자': '005930.KS',
  'SK하이닉스': '000660.KS',
  '현대차': '005380.KS',
  '기아': '000270.KS',
  '네이버': '035420.KS',
  'NAVER': '035420.KS',
  '카카오': '035720.KS',
  'LG에너지솔루션': '373220.KS',
  '한화에어로스페이스': '012450.KS',
  'HD현대일렉트릭': '267260.KS',
  '두산에너빌리티': '034020.KS',
};

const US_TICKERS: Record<string, string> = {
  NVIDIA: 'NVDA', 엔비디아: 'NVDA', NVDA: 'NVDA',
  Tesla: 'TSLA', 테슬라: 'TSLA', TSLA: 'TSLA',
  Apple: 'AAPL', 애플: 'AAPL', AAPL: 'AAPL',
  Microsoft: 'MSFT', 마이크로소프트: 'MSFT', MSFT: 'MSFT',
  Google: 'GOOGL', 구글: 'GOOGL', 알파벳: 'GOOGL',
  Amazon: 'AMZN', 아마존: 'AMZN', AMZN: 'AMZN',
  Meta: 'META', 메타: 'META', META: 'META',
  AMD: 'AMD',
  Broadcom: 'AVGO', 브로드컴: 'AVGO', AVGO: 'AVGO',
  Palantir: 'PLTR', 팔란티어: 'PLTR', PLTR: 'PLTR',
};

// ── Keyword patterns ───────────────────────────────────────────────────────

const RE_EARNINGS = /실적|어닝|earnings|revenue|순이익|영업이익|매출|guidance/i;
const RE_MACRO = /금리|기준금리|FOMC|CPI|인플레|물가|GDP|경기침체|recession|fed|연준/i;
const RE_FX = /환율|달러|원달러|USD\/KRW|달러강세|달러약세|환헤지/i;
const RE_PSYCHOLOGY = /FOMO|패닉셀|공포|탐욕|군중심리|crowd|panic|sell-off|과매도|과매수|불안|흔들|개미|심리/i;
const RE_PORTFOLIO_BEHAVIOR = /변동성|volatility|급락|급등|집중|비중|리밸런싱|rebalancing|분산|패닉|하락|폭락|섹터/i;
const RE_INDEX = /ETF|인덱스|S&P|코스피|코스닥|나스닥|Nasdaq|KOSPI|KOSDAQ/i;
const RE_ALERT = /급락|위기|위험|경고|폭락|crash|붕괴|collapse|meltdown|폭등/i;
const RE_COMPARE = /\bvs\b|대비|비교|차이|격차|상회|하회|outperform|underperform/i;
const RE_JARGON = /베타|알파|샤프|표준편차|상관계수|공분산|헤지|롤오버|레버리지|인버스|옵션|선물|파생/i;
const RE_POLITICAL = /정치|선거|대통령|국회|외교|국방|군사|탄핵|개헌/i;
const RE_FAMILIAR_NAME = /삼성전자|SK하이닉스|애플|테슬라|엔비디아|현대차|기아|카카오|네이버|NVIDIA|Tesla|Apple/i;
const RE_RUMOR = /카더라|소식통|익명|유출/i;
const RE_PLAIN_MACRO = /금리|물가|환율|CPI|GDP|경기침체|FOMC|연준/i;

// ── Ticker identification ──────────────────────────────────────────────────

export function identifyTickers(text: string): string[] {
  const found = new Set<string>();
  for (const [keyword, ticker] of Object.entries(KR_TICKERS)) {
    if (text.includes(keyword)) found.add(ticker);
  }
  for (const [keyword, ticker] of Object.entries(US_TICKERS)) {
    if (text.includes(keyword)) found.add(ticker);
  }
  return [...found];
}

function hasKrPriority(tickers: string[]): boolean {
  return tickers.some((t) => Object.values(KR_TICKERS).includes(t));
}

function hasUsPriority(tickers: string[]): boolean {
  return tickers.some((t) => Object.values(US_TICKERS).includes(t));
}

// ── Category classification ────────────────────────────────────────────────

export function classifyCategory(title: string, snippet: string): Category {
  const text = `${title} ${snippet}`;
  if (RE_PSYCHOLOGY.test(text)) return 'psychology';
  if (RE_FX.test(text)) return 'fx';
  if (RE_EARNINGS.test(text)) return 'earnings';
  if (RE_MACRO.test(text)) return 'macro';
  if (RE_ALERT.test(text)) return 'sector';
  return 'other';
}

// ── Content type classification ────────────────────────────────────────────

export function classifyContentType(
  title: string,
  snippet: string,
  category: Category,
): ContentType {
  const text = `${title} ${snippet}`;
  if (RE_ALERT.test(text)) return '경고형';
  if (RE_PSYCHOLOGY.test(text) || category === 'psychology') return '공감형';
  if (RE_COMPARE.test(text)) return '비교형';
  if (RE_JARGON.test(text)) return '용어풀이형';
  if (RE_MACRO.test(text) || category === 'macro' || category === 'fx') return '설명형';
  return '포트폴리오 점검형';
}

// ── Cross-source frequency (for trendScore) ───────────────────────────────

export function buildTickerSourceCounts(
  items: Array<{ title: string; snippet: string; source: string }>,
): Map<string, number> {
  const tickerSources = new Map<string, Set<string>>();
  for (const item of items) {
    const tickers = identifyTickers(`${item.title} ${item.snippet}`);
    for (const ticker of tickers) {
      if (!tickerSources.has(ticker)) tickerSources.set(ticker, new Set());
      tickerSources.get(ticker)!.add(item.source);
    }
  }
  const counts = new Map<string, number>();
  for (const [ticker, sources] of tickerSources) {
    counts.set(ticker, sources.size);
  }
  return counts;
}

// ── Sub-score functions ────────────────────────────────────────────────────

function computeTrendScore(
  tickers: string[],
  tickerSourceCounts: Map<string, number>,
): number {
  if (tickers.length === 0) return 8;
  const maxCount = Math.max(...tickers.map((t) => tickerSourceCounts.get(t) ?? 1));
  if (maxCount >= 3) return 20;
  if (maxCount === 2) return 12;
  return 8;
}

function computeRelevance(
  title: string,
  snippet: string,
  market: Market,
  category: Category,
  tickers: string[],
): number {
  let score = 0;
  const text = `${title} ${snippet}`;
  if (hasKrPriority(tickers)) score += 12;
  if (hasUsPriority(tickers)) score += 12;
  if (RE_INDEX.test(text)) score += 5;
  if (RE_PORTFOLIO_BEHAVIOR.test(text)) score += 8;
  if (category === 'earnings' || category === 'macro' || category === 'fx') score += 6;
  if (category === 'psychology') score += 8;
  if (market === 'KR') score += 3;
  return Math.min(35, score);
}

function computeBeginnerScore(title: string, snippet: string, category: Category): number {
  let score = 0;
  const text = `${title} ${snippet}`;
  if (RE_FAMILIAR_NAME.test(title)) score += 8;
  if (RE_PLAIN_MACRO.test(text) && !RE_JARGON.test(text)) score += 6;
  if (RE_INDEX.test(title)) score += 5;
  if (category === 'earnings' || RE_EARNINGS.test(title)) score += 5;
  if (RE_JARGON.test(text)) score -= 10;
  return Math.max(0, Math.min(20, score));
}

function computeSourceQuality(source: string): number {
  if (['연합뉴스', 'Reuters', '한국경제'].includes(source)) return 10;
  if (['Yahoo Finance', 'Investing.com'].includes(source)) return 7;
  return 4;
}

function computeNoisePenalty(
  title: string,
  snippet: string,
  category: Category,
  tickers: string[],
): number {
  let penalty = 0;
  const text = `${title} ${snippet}`;
  if (RE_POLITICAL.test(text)) penalty += 15;
  if (tickers.length === 0 && !RE_INDEX.test(text) && category === 'other') penalty += 12;
  if (RE_JARGON.test(text) && !RE_PORTFOLIO_BEHAVIOR.test(text)) penalty += 8;
  if (RE_RUMOR.test(text)) penalty += 10;
  if (/[?？]$/.test(title.trim()) && tickers.length === 0 && !RE_INDEX.test(title)) penalty += 5;
  return Math.min(30, penalty);
}

// ── Public entry point ─────────────────────────────────────────────────────

export function buildScoredItem(
  raw: RawNewsItem & { market: Market },
  tickerSourceCounts: Map<string, number> = new Map(),
): ScoredItem {
  const tickers = identifyTickers(`${raw.title} ${raw.snippet}`);
  const category = classifyCategory(raw.title, raw.snippet);
  const contentType = classifyContentType(raw.title, raw.snippet, category);

  const trend = computeTrendScore(tickers, tickerSourceCounts);
  const relevance = computeRelevance(raw.title, raw.snippet, raw.market, category, tickers);
  const beginner = computeBeginnerScore(raw.title, raw.snippet, category);
  const source = computeSourceQuality(raw.source);
  const penalty = computeNoisePenalty(raw.title, raw.snippet, category, tickers);
  const final = Math.max(0, Math.min(100, trend + relevance + beginner + source - penalty));

  return {
    ...raw,
    category,
    contentType,
    relatedTickers: tickers,
    contentScore: final,
    scoreBreakdown: { trend, relevance, beginner, source, penalty, final },
  };
}

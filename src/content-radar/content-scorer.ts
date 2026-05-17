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

export interface ScoredItem extends RawNewsItem {
  market: Market;
  category: Category;
  contentType: ContentType;
  relatedTickers: string[];
  contentScore: number;
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
  NVIDIA: 'NVDA',
  엔비디아: 'NVDA',
  NVDA: 'NVDA',
  Tesla: 'TSLA',
  테슬라: 'TSLA',
  TSLA: 'TSLA',
  Apple: 'AAPL',
  애플: 'AAPL',
  AAPL: 'AAPL',
  Microsoft: 'MSFT',
  마이크로소프트: 'MSFT',
  MSFT: 'MSFT',
  Google: 'GOOGL',
  구글: 'GOOGL',
  알파벳: 'GOOGL',
  Amazon: 'AMZN',
  아마존: 'AMZN',
  AMZN: 'AMZN',
  Meta: 'META',
  메타: 'META',
  META: 'META',
  AMD: 'AMD',
  Broadcom: 'AVGO',
  브로드컴: 'AVGO',
  AVGO: 'AVGO',
  Palantir: 'PLTR',
  팔란티어: 'PLTR',
  PLTR: 'PLTR',
};

const TRUSTED_SOURCES = new Set(['연합뉴스', 'Reuters', 'Yahoo Finance']);

// ── Keyword patterns ───────────────────────────────────────────────────────

const RE_EARNINGS = /실적|어닝|earnings|revenue|순이익|영업이익|매출|guidance/i;
const RE_MACRO = /금리|기준금리|FOMC|CPI|인플레|물가|GDP|경기침체|recession|fed|연준/i;
const RE_FX = /환율|달러|원달러|USD\/KRW|달러강세|달러약세|환헤지/i;
const RE_TECH = /AI|반도체|semiconductor|데이터센터|data center|LLM|chip|GPU|클라우드|cloud/i;
const RE_PSYCHOLOGY = /FOMO|패닉셀|공포|탐욕|군중심리|crowd|panic|sell-off|과매도|과매수|불안|흔들|개미|심리/i;
const RE_PORTFOLIO_BEHAVIOR = /변동성|volatility|급락|급등|집중|비중|리밸런싱|rebalancing|분산|패닉|하락|폭락|섹터/i;
const RE_INDEX = /ETF|인덱스|S&P|코스피|코스닥|나스닥|Nasdaq|KOSPI|KOSDAQ/i;
const RE_ALERT = /급락|위기|위험|경고|폭락|crash|붕괴|collapse|meltdown|폭등/i;
const RE_COMPARE = /\bvs\b|대비|비교|차이|격차|상회|하회|outperform|underperform/i;
const RE_JARGON = /베타|알파|샤프|표준편차|상관계수|공분산|헤지|롤오버|레버리지|인버스|옵션|선물|파생/i;
const RE_POLITICAL = /정치|선거|대통령|국회|외교|국방|군사|탄핵|개헌/i;

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
  if (RE_TECH.test(text)) return 'tech';
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

// ── Scoring ────────────────────────────────────────────────────────────────

export function scoreItem(
  title: string,
  snippet: string,
  source: string,
  market: Market,
  category: Category,
  tickers: string[],
): number {
  let score = 50;
  const text = `${title} ${snippet}`;

  // Ticker popularity
  if (hasKrPriority(tickers)) score += 15;
  if (hasUsPriority(tickers)) score += 15;

  // Category
  if (category === 'earnings') score += 10;
  if (category === 'psychology') score += 10;
  if (category === 'macro' && RE_MACRO.test(text)) score += 8;

  // KR audience proximity
  if (market === 'KR') score += 5;

  // Portfolio-behavior relevance
  if (RE_PORTFOLIO_BEHAVIOR.test(text)) score += 10;
  if (RE_EARNINGS.test(text)) score += 8;
  if (RE_INDEX.test(text)) score += 5;

  // Source quality
  if (TRUSTED_SOURCES.has(source)) score += 5;

  // Penalties
  if (RE_POLITICAL.test(text)) score -= 10;
  if (RE_JARGON.test(text) && !RE_PORTFOLIO_BEHAVIOR.test(text)) score -= 10;
  if (tickers.length === 0 && category === 'other') score -= 15;

  return Math.max(0, Math.min(100, score));
}

// ── Public entry point ─────────────────────────────────────────────────────

export function buildScoredItem(
  raw: RawNewsItem & { market: Market },
): ScoredItem {
  const tickers = identifyTickers(`${raw.title} ${raw.snippet}`);
  const category = classifyCategory(raw.title, raw.snippet);
  const contentType = classifyContentType(raw.title, raw.snippet, category);
  const contentScore = scoreItem(raw.title, raw.snippet, raw.source, raw.market, category, tickers);

  return {
    ...raw,
    category,
    contentType,
    relatedTickers: tickers,
    contentScore,
  };
}

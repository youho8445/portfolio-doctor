import { ScoredItem, Category, Market, ContentType } from './content-scorer';

// ── Market event detection ─────────────────────────────────────────────────

const EVENT_PATTERNS: Array<{ re: RegExp; label: (t: string) => string }> = [
  {
    re: /팔천피|코스피\s*8[,.]?000/,
    label: (t) => `코스피 8,000${/돌파/.test(t) ? ' 돌파' : /급락|폭락/.test(t) ? ' 급락' : /하락/.test(t) ? ' 하락' : ''}`,
  },
  { re: /FOMC/i, label: () => 'FOMC' },
  { re: /CPI|소비자물가/, label: () => 'CPI 발표' },
  {
    re: /나스닥|Nasdaq/i,
    label: (t) => `나스닥${/돌파/.test(t) ? ' 돌파' : /급락|폭락/.test(t) ? ' 급락' : /하락/.test(t) ? ' 하락' : /상승|급등/.test(t) ? ' 상승' : ''}`,
  },
  {
    re: /S&P\s*500|S&P500/i,
    label: (t) => `S&P500${/돌파/.test(t) ? ' 돌파' : /급락|폭락/.test(t) ? ' 급락' : ''}`,
  },
  {
    re: /코스피/i,
    label: (t) => `코스피${/돌파/.test(t) ? ' 돌파' : /급락|폭락/.test(t) ? ' 급락' : /하락/.test(t) ? ' 하락' : /상승/.test(t) ? ' 상승' : ''}`,
  },
  {
    re: /코스닥/i,
    label: (t) => `코스닥${/돌파/.test(t) ? ' 돌파' : /급락|폭락/.test(t) ? ' 급락' : /하락/.test(t) ? ' 하락' : ''}`,
  },
  { re: /환율|원달러|달러강세|달러약세/, label: () => '환율 변동' },
  { re: /금리|기준금리/, label: () => '금리 변화' },
  { re: /물가|인플레/, label: () => '물가 변동' },
  { re: /AI.{0,3}반도체|반도체.{0,3}AI/, label: () => 'AI·반도체 테마' },
  { re: /실적|어닝|영업이익|순이익|매출/, label: () => '실적 발표' },
];

function detectMarketEvent(title: string, category: Category): string | null {
  for (const { re, label } of EVENT_PATTERNS) {
    if (re.test(title)) return label(title);
  }
  if (category === 'fx') return '환율 변동';
  if (category === 'macro') return '거시경제 변화';
  if (category === 'earnings') return '실적 발표';
  return null;
}

function buildTickerStr(tickers: string[]): string {
  const labels = tickers.slice(0, 2).map(getTickerLabel);
  return labels.length >= 2 ? `${labels[0]}·${labels[1]}` : labels[0] ?? '';
}

// ── Event signal extraction v2 — sentence-first ───────────────────────────

export interface EventSignals {
  eventType: string | null;
  /** Complete spoken first sentence: "코스피가 7200선까지 밀렸습니다." */
  mainEvent: string | null;
  importantNumber: string | null;
  /** Why it happened — complete spoken sentence */
  cause: string | null;
  /** Market-level consequence — complete spoken sentence */
  marketImpact: string | null;
  /** Portfolio-specific risk — complete spoken sentence */
  investorRisk: string | null;
  relatedSector: string | null;
  emotionalTone: 'bearish' | 'bullish' | 'anxious' | 'neutral';
}

const COMPANY_NAMES = [
  '삼성전자', 'SK하이닉스', '현대차', '기아', 'NAVER', '네이버', '카카오',
  'LG에너지솔루션', '한화에어로스페이스', 'HD현대일렉트릭', '두산에너빌리티',
  '엔비디아', '테슬라', '애플', '마이크로소프트', '구글', '메타', '아마존', 'AMD', '브로드컴',
];

// Helpers for extractEventSignals

function extractYearRecord(text: string): string | null {
  const m = text.match(/(\d+)\s*년\s*(만|래)에?\s*(최대|최고|가장\s*큰|최악|가장\s*높)/);
  if (m) return `${m[1]}년 ${m[2]} 가장 큰 수준입니다.`;
  return null;
}

function buildMainEvent(
  title: string, snippet: string, eventType: string | null, company: string | null,
): { sentence: string; number: string | null } | null {
  const full = `${title} ${snippet}`;
  const pct = title.match(/([\d.]+)\s*%p?/)?.[1];
  const pctSuffix = title.includes('%p') ? '%p' : '%';
  const indexLevel = title.match(/([0-9,]+)\s*선/)?.[1];
  const wonLevel = title.match(/([0-9,]+)\s*원/)?.[1];
  const period = /한.달|한달|1개월/.test(title) ? '한 달 만에 '
    : /두.달|두달|2개월/.test(title) ? '두 달 만에 '
    : /사흘|3일/.test(title) ? '사흘 만에 '
    : /이틀|2일/.test(title) ? '이틀 만에 ' : '';

  if (/코스피/.test(title)) {
    if (/급락|폭락|붕괴/.test(title)) {
      if (indexLevel) return { sentence: `코스피가 ${indexLevel}선까지 급락했습니다.`, number: indexLevel };
      if (pct) return { sentence: `코스피가 ${period}${pct}${pctSuffix} 급락했습니다.`, number: pct };
      return { sentence: '코스피가 급락세를 보이고 있습니다.', number: null };
    }
    if (/하락|밀렸/.test(title)) {
      if (indexLevel) return { sentence: `코스피가 ${indexLevel}선까지 밀렸습니다.`, number: indexLevel };
      if (pct) return { sentence: `코스피가 ${pct}${pctSuffix} 하락했습니다.`, number: pct };
      return { sentence: '코스피가 하락 압박을 받고 있습니다.', number: null };
    }
    if (/돌파|신고/.test(title)) {
      if (indexLevel) return { sentence: `코스피가 ${indexLevel}선을 돌파했습니다.`, number: indexLevel };
      return { sentence: '코스피가 신고점을 돌파했습니다.', number: null };
    }
    if (/반등|상승/.test(title)) return { sentence: '코스피가 반등에 성공했습니다.', number: null };
  }
  if (/코스닥/.test(title)) {
    if (/급락|폭락/.test(title)) {
      if (pct) return { sentence: `코스닥이 ${pct}% 급락했습니다.`, number: pct };
      return { sentence: '코스닥이 급락했습니다.', number: null };
    }
    if (/하락/.test(title)) return { sentence: '코스닥이 하락세를 보이고 있습니다.', number: null };
    if (/돌파/.test(title)) return { sentence: '코스닥이 돌파에 성공했습니다.', number: null };
  }
  if (/나스닥|Nasdaq/i.test(title)) {
    if (/급락|폭락/.test(title)) {
      if (pct) return { sentence: `나스닥이 ${pct}% 급락했습니다.`, number: pct };
      return { sentence: '나스닥이 급락했습니다.', number: null };
    }
    if (/돌파|신고/.test(title)) return { sentence: '나스닥이 신고점을 돌파했습니다.', number: null };
    if (/하락/.test(title)) return { sentence: '나스닥이 하락했습니다.', number: null };
  }
  if (/S&P\s*500|S&P500/i.test(title)) {
    if (/급락/.test(title)) return { sentence: 'S&P500이 급락했습니다.', number: null };
    if (/돌파|신고/.test(title)) return { sentence: 'S&P500이 신고점을 돌파했습니다.', number: null };
  }

  if (/생산자물가|PPI/.test(title)) {
    if (pct && /급등|상승|올라/.test(title)) return { sentence: `생산자물가가 ${period}${pct}% 급등했습니다.`, number: pct };
    if (pct) return { sentence: `생산자물가 지수가 ${pct}% 변동했습니다.`, number: pct };
    return { sentence: '생산자물가가 큰 폭으로 올랐습니다.', number: null };
  }
  if (/소비자물가|CPI/.test(title)) {
    if (pct && /급등|상승/.test(title)) return { sentence: `소비자물가가 ${period}${pct}% 올랐습니다.`, number: pct };
    if (/예상\s*(상회|웃돌)/.test(full)) return { sentence: '소비자물가가 시장 예상을 웃돌았습니다.', number: null };
    return { sentence: '소비자물가 지수가 발표됐습니다.', number: null };
  }

  if (eventType === 'fomc') {
    if (/동결/.test(full)) return { sentence: '미 연준이 기준금리를 동결했습니다.', number: null };
    const bps = full.match(/(\d+)\s*bp/i)?.[1];
    if (/인상/.test(full)) {
      if (bps) return { sentence: `미 연준이 기준금리를 ${bps}bp 인상했습니다.`, number: bps };
      return { sentence: '미 연준이 기준금리를 인상했습니다.', number: null };
    }
    if (/인하/.test(full)) return { sentence: '미 연준이 기준금리 인하를 결정했습니다.', number: null };
    return { sentence: 'FOMC 결과가 발표됐습니다.', number: null };
  }
  if (/기준금리/.test(title)) {
    if (/인상/.test(title)) return { sentence: '한국은행이 기준금리를 인상했습니다.', number: null };
    if (/인하/.test(title)) return { sentence: '한국은행이 기준금리를 인하했습니다.', number: null };
    if (/동결/.test(title)) return { sentence: '한국은행이 기준금리를 동결했습니다.', number: null };
  }

  if (eventType === '파업') {
    if (company) return { sentence: `${company} 총파업 가능성이 커지고 있습니다.`, number: null };
    return { sentence: '총파업 가능성이 높아지고 있습니다.', number: null };
  }
  if (eventType === '실적' && company) {
    if (/서프라이즈|호조|최대|역대|어닝비트/.test(title)) return { sentence: `${company}가 실적 서프라이즈를 기록했습니다.`, number: null };
    if (/부진|실망|쇼크|어닝미스|적자/.test(title)) return { sentence: `${company} 실적이 시장 기대에 못 미쳤습니다.`, number: null };
    return { sentence: `${company} 실적이 발표됐습니다.`, number: null };
  }
  if (eventType === '환율') {
    if (wonLevel && /돌파|치솟|급등/.test(title)) return { sentence: `원달러 환율이 ${wonLevel}원을 돌파했습니다.`, number: wonLevel };
    if (wonLevel && /하락|급락/.test(title)) return { sentence: `원달러 환율이 ${wonLevel}원대로 내려왔습니다.`, number: wonLevel };
    if (/급등|강세/.test(title)) return { sentence: '원달러 환율이 급등하며 달러 강세가 이어지고 있습니다.', number: null };
    if (/급락|약세/.test(title)) return { sentence: '원달러 환율이 하락하며 달러 약세가 나타나고 있습니다.', number: null };
    return { sentence: '원달러 환율이 크게 움직이고 있습니다.', number: null };
  }

  if (company) {
    if (/급락|폭락/.test(title)) {
      if (pct) return { sentence: `${company}가 ${pct}% 급락했습니다.`, number: pct };
      return { sentence: `${company}가 급락하고 있습니다.`, number: null };
    }
    if (/급등|폭등/.test(title)) {
      if (pct) return { sentence: `${company}가 ${pct}% 급등했습니다.`, number: pct };
      return { sentence: `${company}가 급등하고 있습니다.`, number: null };
    }
    if (/신고가/.test(title)) return { sentence: `${company}가 신고가를 경신했습니다.`, number: null };
  }
  return null;
}

function buildCause(title: string, snippet: string, eventType: string | null): string | null {
  const text = `${title} ${snippet}`;
  if (/외국인\s*(순매도|매도|이탈)/.test(text) && /차익실현/.test(text))
    return '외국인 순매도와 차익실현 물량이 동시에 쏟아진 영향입니다.';
  if (/외국인\s*(순매도|매도|이탈)/.test(text))
    return '외국인 자금이 빠져나가고 있습니다.';
  if (/차익실현/.test(text) && /급등|상승/.test(text))
    return '급등 이후 차익실현 매물이 쏟아지고 있습니다.';
  if (/국제유가|원유\s*가격/.test(text) && /반도체/.test(text))
    return '국제유가와 반도체 가격 상승 영향입니다.';
  if (/국제유가|원유\s*가격/.test(text))
    return '국제유가 상승이 생산 비용을 밀어올린 결과입니다.';
  if (/달러\s*(강세|급등)/.test(text))
    return '달러 강세와 미국 금리 상승 압박이 맞물린 결과입니다.';
  if (/반도체\s*(수급|수요|가격\s*하락)/.test(text))
    return '반도체 수급과 가격 변화가 직접적인 원인으로 지목됩니다.';
  if (eventType === 'fomc' && /인상/.test(text))
    return '연준의 금리 인상 기조가 이어지고 있습니다.';
  if (/수출\s*(둔화|감소|부진)/.test(text))
    return '수출 둔화가 성장 전망을 흐리고 있습니다.';
  return null;
}

function buildMarketImpact(
  title: string, snippet: string, eventType: string | null, relatedSector: string | null,
): string | null {
  const text = `${title} ${snippet}`;
  const yearRecord = extractYearRecord(text);
  if (yearRecord) return yearRecord;

  if (/생산자물가|PPI/.test(text) && /소비자물가|CPI/.test(text))
    return '문제는 이게 소비자물가까지 번질 수 있다는 점입니다.';
  if (/생산자물가|PPI/.test(text))
    return '생산자물가는 2~3개월 뒤 소비자물가로 전가될 수 있습니다.';

  if (eventType === '파업') {
    const numMatch = text.match(/([\-\d.]+)\s*%p?\s*(하락|감소)/);
    if (numMatch && /성장률|GDP/.test(text))
      return `한국은행은 성장률 ${numMatch[1]}%p 하락 가능성까지 언급했습니다.`;
    if (/성장률|GDP/.test(text)) return '단순 노사 갈등이 아니라 성장률에까지 파급될 수 있습니다.';
    return '생산 라인 중단 → 수출 차질 → 경제 전반으로 이어질 수 있습니다.';
  }
  if (eventType === 'fomc') {
    if (/동결/.test(text)) return '시장이 기다리던 인하 시그널은 아직입니다.';
    if (/인상/.test(text)) return '전 세계 자금이 달러 자산으로 쏠리는 구조입니다.';
    if (/인하/.test(text)) return '위험자산 선호 심리가 살아나는 신호입니다.';
    return '글로벌 자금 흐름 방향이 바뀔 수 있습니다.';
  }
  if (eventType === 'cpi') return '이 숫자가 높으면 연준의 금리 인하 기대가 멀어집니다.';
  if (eventType === '환율' && /강세|상승|급등/.test(text))
    return '수입 물가 상승으로 이어져 국내 물가 압박이 커집니다.';
  if (eventType === '환율' && /약세|하락|급락/.test(text))
    return '수출 기업엔 유리하지만 수입 원자재 비용은 낮아집니다.';
  if (/급락|폭락/.test(title) && relatedSector)
    return `${relatedSector} 섹터 전체로 매도세가 번지고 있습니다.`;
  if (/돌파|신고가/.test(title))
    return '급등 뒤 숨고르기 국면에서 변동성이 커질 수 있습니다.';
  if (/급등|폭등/.test(title) && relatedSector)
    return `${relatedSector} 섹터 전반의 온도가 빠르게 올라가고 있습니다.`;
  return null;
}

function buildInvestorRisk(
  eventType: string | null, relatedSector: string | null,
  emotionalTone: EventSignals['emotionalTone'], company: string | null,
): string | null {
  // Sector-specific: bearish/anxious only — factual loss concentration warning
  if (relatedSector === 'AI·반도체' || relatedSector === '반도체') {
    if (emotionalTone === 'bearish') return '반도체 비중이 높다면 지금 손실 폭이 시장 평균보다 클 수 있습니다.';
    if (emotionalTone === 'anxious') return '반도체 섹터 변동성이 커지고 있는 구간입니다.';
    return null;
  }
  if (relatedSector === '2차전지' && emotionalTone === 'bearish')
    return '2차전지 비중이 높다면 지금 손실이 집중될 수 있습니다.';
  if (relatedSector === 'AI·빅테크') return 'AI·빅테크 집중 포트폴리오는 금리 변화에 민감합니다.';
  // Company-specific: direct, factual impact
  if (eventType === '파업' && company)
    return `${company} 비중이 크다면 생산 차질이 실적에 직접 반영됩니다.`;
  if (eventType === '실적' && company)
    return `${company} 단일 종목 비중이 크다면 실적 충격이 직접 옵니다.`;
  // CPI chain reaction — finance insight, not portfolio advice
  if (eventType === 'cpi')
    return '물가 지속 상승 → 금리 인상 기대 → 성장주·채권 동반 하락 경로가 열립니다.';
  // FX — factual cross-asset observation
  if (eventType === '환율')
    return '달러 자산이나 해외 ETF 비중이 있다면 원화 환산 수익률이 달라집니다.';
  return null;
}

export function extractEventSignals(title: string, snippet: string = ''): EventSignals {
  const full = `${title} ${snippet}`;

  let emotionalTone: EventSignals['emotionalTone'] = 'neutral';
  if (/급락|폭락|최악|위기|붕괴/.test(title)) emotionalTone = 'bearish';
  else if (/급등|폭등|신고가|돌파/.test(title)) emotionalTone = 'bullish';
  else if (/파업|경고|우려|쇼크/.test(title)) emotionalTone = 'anxious';

  let eventType: string | null = null;
  if (/파업|총파업/.test(title)) eventType = '파업';
  else if (/FOMC/i.test(title)) eventType = 'fomc';
  else if (/CPI|소비자물가지수/.test(title)) eventType = 'cpi';
  else if (/생산자물가|PPI/.test(title)) eventType = 'ppi';
  else if (/금리\s*(인상|올리|올려|높여)/.test(full)) eventType = '금리인상';
  else if (/금리\s*(인하|내리|낮춰|동결|유지)/.test(full)) eventType = '금리인하';
  else if (/금리|기준금리/.test(title)) eventType = '금리';
  else if (/실적|어닝|영업이익|순이익/.test(title)) eventType = '실적';
  else if (/상장|IPO/.test(title)) eventType = 'ipo';
  else if (/합병|인수|M&A/.test(title)) eventType = 'ma';
  else if (/돌파/.test(title)) eventType = '돌파';
  else if (/급락|폭락/.test(title)) eventType = '급락';
  else if (/급등|폭등/.test(title)) eventType = '급등';
  else if (/환율|원달러/.test(title)) eventType = '환율';

  let relatedSector: string | null = null;
  if (/AI.{0,5}반도체|반도체.{0,5}AI/.test(full)) relatedSector = 'AI·반도체';
  else if (/반도체|SK하이닉스|삼성전자|엔비디아|TSMC/.test(full)) relatedSector = '반도체';
  else if (/2차전지|배터리|LG에너지솔루션|삼성SDI|양극재/.test(full)) relatedSector = '2차전지';
  else if (/자동차|현대차|기아|EV|전기차/.test(full)) relatedSector = '자동차·전기차';
  else if (/바이오|제약|신약|임상/.test(full)) relatedSector = '바이오·제약';
  else if (/방산|한화에어|조선|HD현대|두산에너/.test(full)) relatedSector = '방산·조선';
  else if (/은행|금융|보험|증권/.test(full)) relatedSector = '금융';
  else if (/AI|클라우드|빅테크/.test(full)) relatedSector = 'AI·빅테크';

  const company = COMPANY_NAMES.find((c) => title.includes(c)) ?? null;
  const mainEventResult = buildMainEvent(title, snippet, eventType, company);

  return {
    eventType,
    mainEvent: mainEventResult?.sentence ?? null,
    importantNumber: mainEventResult?.number ?? null,
    cause: buildCause(title, snippet, eventType),
    marketImpact: buildMarketImpact(title, snippet, eventType, relatedSector),
    investorRisk: buildInvestorRisk(eventType, relatedSector, emotionalTone, company),
    relatedSector,
    emotionalTone,
  };
}

export function generateNewsLead(item: ScoredItem): string {
  const signals = extractEventSignals(item.title, item.snippet);
  if (signals.mainEvent) return signals.mainEvent;

  const tickerStr = buildTickerStr(item.relatedTickers);
  const event = detectMarketEvent(item.title, item.category);
  if (event && tickerStr) return `${event} 이후,\n${tickerStr}에 시장의 이목이 집중되고 있습니다.`;
  if (tickerStr) return `${tickerStr},\n오늘 주목해야 할 이유가 있습니다.`;
  if (event) return `${event} 이슈가\n투자자들의 시선을 끌고 있습니다.`;
  return '오늘 확인해볼 만한 뉴스가 나왔습니다.';
}

// ── Ticker label map ───────────────────────────────────────────────────────

function getTickerLabel(ticker: string): string {
  const map: Record<string, string> = {
    NVDA: '엔비디아', TSLA: '테슬라', AAPL: '애플', MSFT: '마이크로소프트',
    GOOGL: '구글', META: '메타', AMZN: '아마존', AMD: 'AMD',
    AVGO: '브로드컴', PLTR: '팔란티어',
    '005930.KS': '삼성전자', '000660.KS': 'SK하이닉스', '005380.KS': '현대차',
    '000270.KS': '기아', '035420.KS': 'NAVER', '035720.KS': '카카오',
    '373220.KS': 'LG에너지솔루션', '012450.KS': '한화에어로스페이스',
    '267260.KS': 'HD현대일렉트릭', '034020.KS': '두산에너빌리티',
  };
  return map[ticker] ?? ticker;
}

function getTickerHashtag(ticker: string): string | null {
  const map: Record<string, string> = {
    NVDA: '#엔비디아', TSLA: '#테슬라', AAPL: '#애플', MSFT: '#마이크로소프트',
    GOOGL: '#구글', META: '#메타', AMZN: '#아마존', AMD: '#AMD',
    AVGO: '#브로드컴', PLTR: '#팔란티어',
    '005930.KS': '#삼성전자', '000660.KS': '#SK하이닉스', '005380.KS': '#현대차',
    '000270.KS': '#기아', '035420.KS': '#네이버', '035720.KS': '#카카오',
    '373220.KS': '#LG에너지솔루션',
  };
  return map[ticker] ?? null;
}

// ── CTA pool ──────────────────────────────────────────────────────────────

const CTA_POOL = [
  '내 포트폴리오 비중은 PoBalance에서 확인해보세요.',
  '뉴스보다 중요한 건 내 포트폴리오 안에서의 비중입니다.',
  '포트폴리오 건강검진은 PoBalance에서.',
  '섹터 편중 체크, PoBalance에서 지금 바로.',
  '변동성 시장, 내 리스크는 얼마인지 확인해보세요. PoBalance.',
];

export function generateCTA(item: ScoredItem): string {
  return CTA_POOL[item.contentScore % CTA_POOL.length];
}

// ── whyItMattersToPortfolio ────────────────────────────────────────────────

const WHY_TEMPLATES: Record<Category, Partial<Record<Market | 'default', string>>> = {
  earnings: {
    KR: '{ticker} 실적 발표가 있었습니다. 해당 종목 비중이 높은 포트폴리오라면 집중도 점검이 필요할 수 있습니다.',
    US: '{ticker} earnings results are in. Heavy concentration in a single earnings-sensitive stock can amplify portfolio swings.',
    default: '실적 이벤트는 단기 변동성을 높입니다. 특정 종목 비중이 높다면 분산 효과를 점검해보세요.',
  },
  macro: {
    KR: '금리·거시지표 변화는 모든 자산군에 영향을 줍니다. 포트폴리오의 채권·주식 비중 균형을 확인해보세요.',
    US: 'Macro shifts affect all asset classes. Check whether your portfolio is over-exposed to rate-sensitive sectors.',
    default: '금리와 경기 사이클 변화는 섹터별 영향이 다릅니다. 방어주와 성장주 비중 균형을 살펴보세요.',
  },
  fx: {
    KR: '환율 변동은 해외 자산을 보유한 포트폴리오에 직접적인 영향을 미칩니다. 달러 노출 비중을 확인해보세요.',
    US: 'FX moves directly impact international holdings. Your USD-denominated assets may look different in KRW terms.',
    default: '환율은 조용한 포트폴리오 리스크입니다. 해외 비중이 크다면 환헤지 여부를 점검해보세요.',
  },
  tech: {
    KR: 'AI·반도체 섹터에 집중된 포트폴리오는 섹터 변동성에 민감합니다. 섹터 편중 여부를 점검해보세요.',
    US: 'Heavy tech/AI concentration amplifies sector risk. Consider whether sector diversification fits your risk tolerance.',
    default: 'AI·기술주 비중이 높으면 섹터 편중 리스크가 생깁니다. 포트폴리오 전체 밸런스를 점검해보세요.',
  },
  sector: {
    KR: '특정 섹터에 집중된 포트폴리오는 해당 섹터 뉴스에 더 많이 흔들릴 수 있습니다.',
    US: 'Sector-heavy portfolios swing harder when sector news breaks. Diversification smooths out these moves.',
    default: '섹터 이벤트는 집중 투자 시 손실 폭을 키웁니다. 분산 효과가 충분한지 점검해보세요.',
  },
  psychology: {
    KR: '시장 심리는 단기 가격에 가장 큰 영향을 줍니다. 감정 기반 매매 전에 포트폴리오 목표 비중을 다시 확인해보세요.',
    US: 'Market psychology drives short-term prices. Before acting on FOMO or panic, revisit your target allocations.',
    default: '시장이 흔들릴 때 포트폴리오 목표 비중으로 돌아오는 것이 리밸런싱의 핵심입니다.',
  },
  other: {
    KR: '포트폴리오 건강도는 종목 선택만큼 비중 관리가 중요합니다.',
    US: 'Portfolio health depends as much on allocation as on stock selection.',
    default: '투자 결정 전 내 포트폴리오의 비중과 리스크 수준을 먼저 점검해보세요.',
  },
};

export function generateWhyItMatters(item: ScoredItem): string {
  const templates = WHY_TEMPLATES[item.category];
  const template = templates[item.market] ?? templates['default'] ?? '포트폴리오 비중과 리스크를 점검해보세요.';
  const ticker = item.relatedTickers[0] ? getTickerLabel(item.relatedTickers[0]) : '이 종목';
  return template.replace(/{ticker}/g, ticker);
}

// ── Beginner caution ──────────────────────────────────────────────────────

const BEGINNER_CAUTION: Record<Category, string> = {
  earnings: '실적 발표 당일 단기 등락만 보고 충동 매수·매도하지 마세요. 실적은 이미 주가에 선반영된 경우가 많습니다.',
  macro: '금리·물가 지표 하나로 전체 포트폴리오를 바꾸지 마세요. 매크로는 장기 방향성을 보는 신호입니다.',
  fx: '환율 변동으로 단기 환차익을 노리는 매매는 리스크가 큽니다. 해외 비중 점검 용도로 활용하세요.',
  tech: 'AI·반도체 테마 뉴스만 보고 단기 추격 매수하지 마세요. 섹터 편중 여부를 먼저 확인하세요.',
  sector: '섹터 이슈가 터졌을 때 감정적으로 전량 매도하지 마세요. 비중 조정이 전량 청산보다 현명한 경우가 많습니다.',
  psychology: '시장 공포나 FOMO 감정으로 즉각 행동하지 마세요. 감정 기반 매매는 장기 수익률을 갉아먹습니다.',
  other: '뉴스 하나로 투자 결정을 내리지 마세요. 내 포트폴리오 비중과 리스크 수준을 먼저 확인하세요.',
};

export function generateBeginnerCaution(item: ScoredItem): string {
  return BEGINNER_CAUTION[item.category];
}

// ── Opening hook ──────────────────────────────────────────────────────────

const HOOK_TEMPLATES: Record<ContentType, string[]> = {
  '경고형': [
    '"{ticker} 뉴스, 내 포트폴리오에는 어떤 영향일까요?"',
    '"지금 이 뉴스를 놓치면 나중에 후회할 수 있습니다."',
    '"포트폴리오에 이 종목이 있다면 오늘 이 뉴스는 꼭 보세요."',
  ],
  '공감형': [
    '"나만 이런 감정 느끼는 건 아니겠죠?"',
    '"시장이 흔들릴 때 여러분은 어떻게 하시나요?"',
    '"솔직히 말씀드리면, 저도 가끔 이럴 때 불안해집니다."',
  ],
  '설명형': [
    '"{topic}이 내 주식에 미치는 영향, 쉽게 설명해드립니다."',
    '"이 단어 하나로 시장이 움직입니다. 왜 그럴까요?"',
    '"투자자라면 오늘 이 지표는 꼭 알아야 합니다."',
  ],
  '용어풀이형': [
    '"이 단어, 투자하면서 자주 보셨죠? 오늘 제대로 알려드립니다."',
    '"어렵게만 느껴지는 투자 용어, 30초 안에 이해시켜 드립니다."',
    '"금융 뉴스 읽다가 이 단어에서 막히셨나요?"',
  ],
  '비교형': [
    '"A와 B, 내 포트폴리오엔 어느 쪽이 더 맞을까요?"',
    '"둘 중 어느 게 더 나을까요? 직접 비교해봤습니다."',
    '"같은 돈으로 투자할 때, 이 차이를 알면 달라집니다."',
  ],
  '포트폴리오 점검형': [
    '"이 뉴스가 내 포트폴리오와 무슨 관계일까요?"',
    '"포트폴리오 점검이 필요한 타이밍이 왔습니다."',
    '"수익률보다 먼저 봐야 할 게 있습니다. 비중입니다."',
  ],
};

export function generateOpeningHook(item: ScoredItem): string {
  const options = HOOK_TEMPLATES[item.contentType];
  const idx = item.contentScore % options.length;
  const ticker = item.relatedTickers[0] ? getTickerLabel(item.relatedTickers[0]) : '이 종목';
  const topic =
    item.category === 'macro' ? '금리 변화'
    : item.category === 'fx' ? '환율 변동'
    : item.category === 'earnings' ? '실적 이벤트'
    : item.category === 'tech' ? 'AI·반도체 섹터'
    : '이 뉴스';
  return options[idx]
    .replace(/{ticker}/g, ticker)
    .replace(/{topic}/g, topic);
}

// ── 15s Reels script ──────────────────────────────────────────────────────

export function generateScript15s(item: ScoredItem): string {
  const signals = extractEventSignals(item.title, item.snippet);
  const useCTA = item.category === 'psychology' || item.contentType === '포트폴리오 점검형' || item.category === 'sector';

  if (signals.mainEvent) {
    const parts: string[] = [signals.mainEvent];

    if (signals.marketImpact) parts.push(signals.marketImpact);
    else if (signals.cause) parts.push(signals.cause);
    else if (signals.relatedSector) parts.push(`${signals.relatedSector} 섹터 전체가 영향을 받는 이슈입니다.`);

    if (signals.investorRisk) parts.push(signals.investorRisk);

    if (useCTA) parts.push(generateCTA(item));
    return parts.join('\n\n');
  }

  const lead = generateNewsLead(item);
  const impact = generateWhyItMatters(item);
  if (useCTA) return [lead, impact, generateCTA(item)].join('\n\n');
  return [lead, impact].join('\n\n');
}

// ── 30s Reels script ──────────────────────────────────────────────────────

export function generateScript30s(item: ScoredItem): string {
  const signals = extractEventSignals(item.title, item.snippet);
  const ticker = item.relatedTickers[0] ? getTickerLabel(item.relatedTickers[0]) : '이 종목';
  const useCTA = item.category === 'psychology' || item.contentType === '포트폴리오 점검형' || item.category === 'sector';

  if (signals.mainEvent) {
    const parts: string[] = [signals.mainEvent];
    if (signals.cause) parts.push(signals.cause);
    if (signals.marketImpact) parts.push(signals.marketImpact);

    switch (item.category) {
      case 'earnings':
        if (signals.emotionalTone === 'bullish') {
          parts.push(`하지만 실적 서프라이즈도\n기대가 이미 선반영됐다면 주가는 오히려 빠질 수 있습니다.`);
        } else if (signals.emotionalTone === 'bearish') {
          parts.push(`실적 쇼크 이후 방향은\n다음 분기 가이던스가 결정합니다.`);
        } else {
          parts.push(`실적은 숫자보다 '컨센서스 대비 차이'가 핵심입니다.\n예상 대비 얼마나 웃돌거나 밑돌았는지가 주가를 움직입니다.`);
        }
        break;
      case 'macro':
        parts.push('이런 지표는 주식만이 아니라\n채권·달러·금 모두를 동시에 흔듭니다.');
        break;
      case 'fx':
        if (/강세|달러강세|달러\s*오름/.test(`${item.title} ${item.snippet ?? ''}`)) {
          parts.push('달러 강세는 외국인 자금 이탈 → 코스피 수급 압박으로\n이어지는 경우가 많습니다.');
        } else {
          parts.push('달러 약세는 신흥국 증시에 외국인 자금이 유입되는\n신호가 될 수 있습니다.');
        }
        break;
      case 'psychology': {
        if (signals.emotionalTone === 'bullish') {
          parts.push('모두가 확신할 때가 가장 위험한 순간입니다.\nFOMO로 추격 매수하면 고점에서 물릴 가능성이 높습니다.');
        } else if (signals.emotionalTone === 'bearish') {
          parts.push('패닉셀은 바닥 직전에 가장 많이 나옵니다.\n공포가 절정일 때 오히려 기회가 생기기도 합니다.');
        } else {
          parts.push('시장 심리는 단기 가격을 가장 많이 왜곡합니다.\n극단적인 낙관이나 비관은 반전의 선행 지표입니다.');
        }
        break;
      }
      case 'sector':
        if (signals.relatedSector) {
          parts.push(`${signals.relatedSector} 섹터에서 어떤 종목이 먼저 반응하는지 보면\n다음 수급 흐름을 읽는 데 도움이 됩니다.`);
        } else {
          parts.push('섹터 이슈가 터졌을 때 가장 먼저 볼 것은\n어디서 수급이 이탈하고 어디로 돌아서는지입니다.');
        }
        break;
      default:
        if (signals.relatedSector) {
          parts.push(`${signals.relatedSector} 섹터 전반의 수급 흐름을 함께 봐야 합니다.`);
        }
        break;
    }

    if (signals.investorRisk) parts.push(signals.investorRisk);
    if (useCTA) parts.push(generateCTA(item));
    return parts.join('\n\n');
  }

  // Fallback
  const opener = generateNewsLead(item);
  const caution = BEGINNER_CAUTION[item.category];
  switch (item.category) {
    case 'earnings':
      return (
        `${opener}\n\n실적이 좋아도 기대가 선반영됐다면\n주가는 오히려 "사실 확인 후 매도" 흐름을 보일 수 있습니다.\n\n${ticker}의 다음 분기 가이던스가 방향을 결정합니다.` +
        (useCTA ? `\n\n${generateCTA(item)}` : '')
      );
    case 'macro':
      return (
        `${opener}\n\n주식, 채권, 달러 자산까지\n모든 자산군에 직접적인 영향을 줍니다.\n\n${caution}` +
        (useCTA ? `\n\n${generateCTA(item)}` : '')
      );
    default:
      return `${opener}\n\n${caution}` + (useCTA ? `\n\n${generateCTA(item)}` : '');
  }
}

// ── Subtitle lines (5 lines for reel visuals) ─────────────────────────────

const SUBTITLE_TAILS: Record<Category, string[]> = {
  earnings: ['실적 서프라이즈 or 쇼크', '컨센서스 대비 얼마나?', '가이던스가 방향을 정한다'],
  macro: ['지표가 시장을 흔든다', '자금 흐름 방향 주목', '채권·달러·주식 동시 영향'],
  fx: ['환율 = 수급의 신호', '외국인 자금 흐름 주목', '달러 강세의 연쇄 효과'],
  tech: ['AI 모멘텀 vs 펀더멘털', '반도체 수급 사이클 확인', '테마인가 실적인가'],
  psychology: ['감정 기반 매매의 함정', 'FOMO vs 패닉셀', 'PoBalance에서 비중 점검'],
  sector: ['섹터 수급 이탈 감지', '어떤 종목이 먼저 반응?', 'PoBalance에서 비중 확인'],
  other: ['시장 변화 감지', '수급 흐름 주목', '투자자 심리 분석'],
};

const SUBTITLE_LINE2_FALLBACK: Record<Category, string> = {
  earnings: '실적 발표 주목',
  macro: '거시경제 변수 등장',
  fx: '환율 변동 확인',
  tech: 'AI·반도체 섹터 주목',
  psychology: 'FOMO vs 패닉셀',
  sector: '섹터 이슈 발생',
  other: '시장 변화 감지',
};

export function generateSubtitleLines(item: ScoredItem): string[] {
  const signals = extractEventSignals(item.title, item.snippet);
  const tickerStr = buildTickerStr(item.relatedTickers);
  const tail = SUBTITLE_TAILS[item.category] ?? SUBTITLE_TAILS.other;

  const line1 = signals.mainEvent
    ? signals.mainEvent.replace(/했습니다\.$|입니다\.$|있습니다\.$|됐습니다\.$/, '').trim().slice(0, 22)
    : (() => {
        const event = detectMarketEvent(item.title, item.category);
        return event ?? (tickerStr ? `${tickerStr} 소식` : item.title.slice(0, 20) + (item.title.length > 20 ? '…' : ''));
      })();

  const shorten = (s: string) => { const t = s.replace(/\s*—.*$/, '').trim(); return t.length > 18 ? t.slice(0, 18) + '…' : t; };

  let line2: string;
  if (signals.marketImpact) {
    line2 = shorten(signals.marketImpact);
  } else if (signals.investorRisk) {
    line2 = shorten(signals.investorRisk);
  } else if (tickerStr) {
    line2 = `${tickerStr} 집중 주목`;
  } else {
    line2 = SUBTITLE_LINE2_FALLBACK[item.category];
  }

  return [line1, line2, ...tail];
}

// ── Caption ────────────────────────────────────────────────────────────────

export function generateCaption(item: ScoredItem): string {
  const ticker = item.relatedTickers[0] ? getTickerLabel(item.relatedTickers[0]) : '이 소식';
  const useCTA = item.category === 'psychology' || item.contentType === '포트폴리오 점검형' || item.category === 'sector';
  const lines: string[] = [];

  if (item.category === 'earnings') {
    lines.push(`${ticker} 실적 발표가 있었습니다.`);
    lines.push('');
    lines.push('투자자들이 실제로 주목하는 건');
    lines.push("숫자보다 '컨센서스 대비 차이'입니다.");
    lines.push('');
    lines.push('예상보다 얼마나 웃돌거나 밑돌았는지,');
    lines.push('그리고 다음 분기 가이던스가 어떤지.');
    lines.push('');
    lines.push('이 두 가지가 실적 발표 이후 주가 방향을 결정합니다.');
  } else if (item.category === 'psychology') {
    lines.push('시장이 흔들릴 때 대부분의 사람들은');
    lines.push('감정으로 움직입니다.');
    lines.push('');
    lines.push('FOMO, 패닉셀, 군중심리 —');
    lines.push('이 감정들은 수익률을 갉아먹는 조용한 적입니다.');
    lines.push('');
    lines.push('흔들릴 때일수록 목표 비중으로 돌아오세요.');
    lines.push('그게 리밸런싱의 핵심입니다.');
  } else if (item.category === 'macro') {
    lines.push('금리·물가·환율 같은 거시지표가 나올 때');
    lines.push('시장이 가장 먼저 반응합니다.');
    lines.push('');
    lines.push('이 숫자들이 중요한 건');
    lines.push('주식만이 아니라 채권·달러·원자재까지');
    lines.push('모든 자산 가격에 동시에 영향을 미치기 때문입니다.');
    lines.push('');
    lines.push('오늘 발표된 수치가 시장 기대와 얼마나 다른지,');
    lines.push('그 차이가 방향을 결정합니다.');
  } else if (item.category === 'fx') {
    lines.push('달러가 움직이면 코스피도 움직입니다.');
    lines.push('');
    lines.push('외국인 투자자들은 달러 강세 국면에서');
    lines.push('신흥국 자산을 팔고 달러 자산으로 이동합니다.');
    lines.push('');
    lines.push('환율 뉴스가 단순한 환전 이야기가 아닌 이유입니다.');
  } else if (item.category === 'tech') {
    lines.push(`${ticker} 관련 소식이 나왔습니다.`);
    lines.push('');
    lines.push('AI·반도체 섹터에서 중요한 건');
    lines.push("지금의 상승이 '실적 개선'인지 '테마 기대감'인지입니다.");
    lines.push('');
    lines.push('테마주는 모멘텀이 꺾이면 되돌림이 빠릅니다.');
    lines.push('펀더멘털 변화를 확인하는 게 중요합니다.');
  } else {
    lines.push(`${ticker}에 대한 소식입니다.`);
    lines.push('');
    lines.push('수익률 숫자만 보지 말고');
    lines.push('시장 전체 흐름 안에서 이 뉴스가');
    lines.push('어떤 의미를 갖는지 파악하는 게 중요합니다.');
  }

  if (useCTA) {
    lines.push('');
    lines.push(`👉 ${generateCTA(item)}`);
  }
  return lines.join('\n');
}

// ── Glossary terms ─────────────────────────────────────────────────────────

const GLOSSARY_BY_CATEGORY: Record<Category, string[]> = {
  earnings: ['실적 이벤트', '집중투자', '섹터 편중'],
  macro: ['금리 리스크', '자산 배분', '포트폴리오 균형'],
  fx: ['환율 리스크', '해외 자산', '환헤지'],
  tech: ['섹터 편중', '변동성', '집중투자'],
  sector: ['섹터 리스크', '분산 효과', '비중 조정'],
  psychology: ['패닉셀', 'FOMO', '군중심리', '리밸런싱'],
  other: ['포트폴리오 점검', '비중 관리', '분산 투자'],
};

export function generateGlossaryTerms(item: ScoredItem): string[] {
  return GLOSSARY_BY_CATEGORY[item.category] ?? ['포트폴리오 점검', '비중 관리'];
}

// ── Hashtags ───────────────────────────────────────────────────────────────

const BASE_HASHTAGS = ['#포트폴리오', '#리스크관리', '#투자공부'];

const CATEGORY_HASHTAGS: Record<Category, string[]> = {
  earnings: ['#실적발표', '#주식투자', '#장기투자'],
  macro: ['#금리', '#경제지표', '#매크로'],
  fx: ['#환율', '#달러', '#해외주식'],
  tech: ['#AI주식', '#반도체', '#성장주'],
  sector: ['#섹터투자', '#분산투자', '#주식'],
  psychology: ['#투자심리', '#FOMO', '#리밸런싱'],
  other: ['#주식투자', '#분산투자', '#개인투자자'],
};

const MARKET_HASHTAGS: Record<Market, string[]> = {
  KR: ['#한국주식', '#코스피', '#국내주식'],
  US: ['#미국주식', '#나스닥', '#S&P500'],
  GLOBAL: ['#글로벌투자', '#해외주식'],
};

export function generateHashtags(item: ScoredItem): string[] {
  const tags = new Set<string>([...BASE_HASHTAGS]);
  for (const t of CATEGORY_HASHTAGS[item.category] ?? []) tags.add(t);
  for (const t of MARKET_HASHTAGS[item.market] ?? []) tags.add(t);
  for (const ticker of item.relatedTickers.slice(0, 2)) {
    const tag = getTickerHashtag(ticker);
    if (tag) tags.add(tag);
  }
  return [...tags].slice(0, 10);
}

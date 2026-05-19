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

// ── Event signal extraction ────────────────────────────────────────────────

export interface EventSignals {
  eventType: string | null;
  mainConflict: string | null;
  macroImpact: string | null;
  relatedSector: string | null;
  investorConcern: string | null;
  emotionalAngle: 'FOMO' | '공포' | '불안' | '기대' | null;
}

const COMPANY_NAMES = [
  '삼성전자', 'SK하이닉스', '현대차', '기아', 'NAVER', '네이버', '카카오',
  'LG에너지솔루션', '한화에어로스페이스', 'HD현대일렉트릭', '두산에너빌리티',
  '엔비디아', '테슬라', '애플', '마이크로소프트', '구글', '메타', '아마존', 'AMD', '브로드컴',
];

export function extractEventSignals(title: string, snippet: string = ''): EventSignals {
  const full = `${title} ${snippet}`;

  let emotionalAngle: EventSignals['emotionalAngle'] = null;
  if (/돌파|신고가|최고가|급등|폭등/.test(title)) emotionalAngle = 'FOMO';
  else if (/급락|폭락|최악|위기/.test(title)) emotionalAngle = '공포';
  else if (/파업|경고|우려|쇼크/.test(title)) emotionalAngle = '불안';
  else if (/회복|반등|서프라이즈|호조/.test(title)) emotionalAngle = '기대';

  let eventType: string | null = null;
  if (/파업|총파업/.test(title)) eventType = '파업';
  else if (/FOMC/i.test(title)) eventType = 'fomc';
  else if (/CPI|소비자물가지수/.test(title)) eventType = 'cpi';
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

  const company = COMPANY_NAMES.find((c) => title.includes(c));
  let mainConflict: string | null = null;

  if (eventType === '파업') {
    mainConflict = company ? `${company} 총파업` : '대기업 총파업';
  } else if (eventType === '실적') {
    const isGood = /서프라이즈|호조|신기록|최대|역대|어닝비트/.test(title);
    const isBad = /부진|실망|쇼크|어닝미스|감소|적자/.test(title);
    mainConflict = company
      ? `${company} 실적 ${isGood ? '서프라이즈' : isBad ? '부진' : '발표'}`
      : '실적 발표';
  } else if (eventType === '돌파') {
    if (/팔천피|코스피\s*8[,.]?000/.test(title)) mainConflict = '코스피 8,000 돌파';
    else if (/나스닥|Nasdaq/i.test(title)) mainConflict = '나스닥 신고점 돌파';
    else if (/S&P\s*500|S&P500/i.test(title)) mainConflict = 'S&P500 신고점 돌파';
    else if (company) mainConflict = `${company} 신고가`;
  } else if (eventType === '급락') {
    if (/코스피/.test(title)) mainConflict = '코스피 급락';
    else if (/나스닥|Nasdaq/i.test(title)) mainConflict = '나스닥 급락';
    else if (company) mainConflict = `${company} 급락`;
  } else if (eventType === '급등') {
    if (company) mainConflict = `${company} 급등`;
    else if (/나스닥|Nasdaq/i.test(title)) mainConflict = '나스닥 급등';
  } else if (eventType === 'fomc') {
    if (/동결/.test(full)) mainConflict = 'FOMC 금리 동결 결정';
    else if (/인상/.test(full)) mainConflict = 'FOMC 금리 인상 결정';
    else if (/인하/.test(full)) mainConflict = 'FOMC 금리 인하 결정';
    else mainConflict = 'FOMC 결과 발표';
  } else if (eventType === 'cpi') {
    const numMatch = title.match(/([\d.]+)\s*%/);
    mainConflict = numMatch ? `CPI ${numMatch[1]}% 발표` : 'CPI 물가 지표 발표';
  } else if (eventType === '금리인상') {
    mainConflict = '기준금리 인상 결정';
  } else if (eventType === '금리인하') {
    mainConflict = /동결/.test(full) ? '기준금리 동결 결정' : '기준금리 인하 결정';
  } else if (eventType === '환율') {
    if (/강세|상승|급등/.test(title)) mainConflict = '달러 강세 — 원달러 환율 급등';
    else if (/약세|하락|급락/.test(title)) mainConflict = '달러 약세 — 원달러 환율 하락';
    else mainConflict = '원달러 환율 급변동';
  } else if (eventType === 'ma' && company) {
    mainConflict = `${company} ${/인수/.test(title) ? '인수' : '합병'} 발표`;
  } else if (company) {
    if (/급락|폭락/.test(title)) mainConflict = `${company} 급락`;
    else if (/급등|폭등/.test(title)) mainConflict = `${company} 급등`;
  }

  let relatedSector: string | null = null;
  if (/AI.{0,5}반도체|반도체.{0,5}AI/.test(full)) relatedSector = 'AI·반도체';
  else if (/반도체|SK하이닉스|삼성전자|엔비디아|TSMC/.test(full)) relatedSector = '반도체';
  else if (/2차전지|배터리|LG에너지솔루션|삼성SDI|양극재/.test(full)) relatedSector = '2차전지';
  else if (/자동차|현대차|기아|EV|전기차/.test(full)) relatedSector = '자동차·전기차';
  else if (/바이오|제약|신약|임상/.test(full)) relatedSector = '바이오·제약';
  else if (/방산|한화|조선|HD현대|두산/.test(full)) relatedSector = '방산·조선';
  else if (/은행|금융|보험|증권/.test(full)) relatedSector = '금융';
  else if (/AI|클라우드|빅테크/.test(full)) relatedSector = 'AI·빅테크';

  let macroImpact: string | null = null;
  if (/한국은행/.test(full)) {
    const numMatch = full.match(/([\-\d.]+)\s*%p?\s*(하락|상승|둔화|감소)/);
    macroImpact = numMatch
      ? `한국은행, 성장률 ${numMatch[1]}%p ${numMatch[2]} 경고`
      : '한국은행이 경고를 꺼냈습니다';
  } else if (/성장률|GDP/.test(full)) {
    const numMatch = full.match(/([\-\d.]+)\s*%p?\s*(하락|상승|둔화|감소)/);
    macroImpact = numMatch
      ? `경제성장률 ${numMatch[1]}%p ${numMatch[2]} 전망`
      : '경제성장률 하락 우려';
  } else if (eventType === 'fomc') {
    if (/동결/.test(full)) macroImpact = '미 연준 금리 동결 — 시장 기대 충족 여부가 관건';
    else if (/인상/.test(full)) macroImpact = '미 연준 금리 인상 — 달러 강세·신흥국 자금 이탈 압력';
    else if (/인하/.test(full)) macroImpact = '미 연준 금리 인하 — 위험자산 선호 심리 강화';
    else macroImpact = '미 연준 통화정책 결정 — 전 세계 자금 흐름 변화';
  } else if (eventType === 'cpi') {
    macroImpact = '물가 압력 지속 → 연준 추가 금리 인상 기대 변화';
  } else if (eventType === '금리인상') {
    macroImpact = '기준금리 인상 — 대출 비용 상승·성장주 밸류에이션 압박';
  } else if (eventType === '금리인하') {
    macroImpact = /동결/.test(full)
      ? '금리 동결 — 유동성 확대 기대 제한'
      : '기준금리 인하 — 유동성 확대·성장주 반등 기대';
  } else if (eventType === '파업' && (relatedSector === '반도체' || relatedSector === 'AI·반도체')) {
    macroImpact = '반도체 수출 차질 → 한국 경제 전반에 파급 가능성';
  } else if (eventType === '환율') {
    if (/강세|상승/.test(title)) macroImpact = '달러 강세 — 수입 물가 압박·해외 자산 원화가치 상승';
    else macroImpact = '달러 약세 — 수출 기업 수혜·해외 자산 원화가치 하락';
  }

  let investorConcern: string | null = null;
  if (eventType === '파업') {
    investorConcern = relatedSector
      ? `${relatedSector} 생산 차질 — 수출 의존 포트폴리오 직접 영향`
      : '생산 차질 및 수익성 악화 우려';
  } else if (eventType === '실적') {
    const isGood = /서프라이즈|호조|신기록|최대|역대/.test(title);
    investorConcern = isGood
      ? '좋은 실적에도 "사실 확인 후 매도" 흐름 주의 — 기대 선반영 가능성'
      : '실적 부진 → 집중 보유 포트폴리오 손실 확대 가능';
  } else if (eventType === '돌파' || emotionalAngle === 'FOMO') {
    investorConcern = '고점 추격 매수 리스크 — 숨고르기 구간 변동성 확대 가능';
  } else if (eventType === '급락') {
    investorConcern = '섹터 집중 포트폴리오 손실 폭 확대 — 패닉셀 충동 주의';
  } else if (eventType === '금리인상' || eventType === 'fomc') {
    investorConcern = '금리 민감 성장주·리츠 비중이 높은 포트폴리오 점검 필요';
  } else if (eventType === 'cpi') {
    investorConcern = '물가 지속 → 추가 금리 인상 시 성장주·채권 동반 압박';
  } else if (eventType === '환율') {
    investorConcern = '달러 노출 비중에 따라 포트폴리오 실질 수익률이 달라집니다';
  } else if (relatedSector) {
    investorConcern = `${relatedSector} 섹터 편중 포트폴리오 변동성 주의`;
  }

  return { eventType, mainConflict, macroImpact, relatedSector, investorConcern, emotionalAngle };
}

function buildEventHook(signals: EventSignals): string {
  if (signals.eventType === '파업') return '단순 노사 갈등이 아닙니다.';
  if (signals.eventType === '실적') return '실적 숫자만 볼 게 아닙니다.';
  if (signals.eventType === 'fomc') return '미 연준 결정, 전 세계 자금 흐름이 바뀝니다.';
  if (signals.eventType === 'cpi') return '물가 지표 하나가 시장 흐름을 바꿉니다.';
  if (signals.eventType === '금리인상') return '금리 인상, 성장주에 직격탄입니다.';
  if (signals.eventType === '금리인하') return '금리 인하, 위험자산에 뭔가 달라집니다.';
  if (signals.eventType === '금리') return '금리 변화, 내 포트폴리오와 연결해서 봐야 합니다.';
  if (signals.eventType === '환율') return '환율은 보이지 않는 포트폴리오 리스크입니다.';
  if (signals.emotionalAngle === 'FOMO') return '지금 FOMO, 가장 조심해야 할 타이밍입니다.';
  if (signals.emotionalAngle === '공포') return '패닉 전에, 내 포트폴리오 구조를 먼저 봐야 합니다.';
  if (signals.eventType === '돌파') return '돌파 랠리, 그 이면을 봐야 합니다.';
  if (signals.eventType === '급락') return '급락 이후, 투자자들의 판단이 갈립니다.';
  return '단순 뉴스가 아닌, 포트폴리오 점검 신호입니다.';
}

export function generateNewsLead(item: ScoredItem): string {
  const signals = extractEventSignals(item.title, item.snippet);
  const tickerStr = buildTickerStr(item.relatedTickers);

  if (signals.mainConflict && signals.macroImpact) {
    return `${signals.mainConflict},\n단순 회사 문제가 아닙니다.`;
  }
  if (signals.mainConflict && tickerStr) {
    return `${signals.mainConflict} 이후,\n시장의 관심이 ${tickerStr}에 쏠리고 있습니다.`;
  }
  if (signals.mainConflict) {
    return `${signals.mainConflict}.\n${buildEventHook(signals)}`;
  }

  const event = detectMarketEvent(item.title, item.category);
  if (event && tickerStr) {
    return `${event} 이후,\n시장의 관심이 ${tickerStr}에 쏠리고 있습니다.`;
  }
  if (tickerStr) {
    return `${tickerStr},\n오늘 시장에서 주목해야 할 이유가 있습니다.`;
  }
  if (event) {
    return `${event} 이슈가\n오늘 시장의 핵심 변수로 떠올랐습니다.`;
  }
  return '오늘 시장에서 확인해볼 만한\n뉴스가 나왔습니다.';
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
  const cta = generateCTA(item);

  if (signals.mainConflict) {
    const parts: string[] = [];
    parts.push(`${signals.mainConflict}.\n${buildEventHook(signals)}`);

    if (signals.macroImpact) {
      parts.push(signals.macroImpact);
    } else if (signals.relatedSector) {
      parts.push(`${signals.relatedSector} 섹터 집중 포트폴리오가 가장 큰 영향을 받습니다.`);
    } else {
      parts.push(generateWhyItMatters(item));
    }

    if (signals.investorConcern) {
      parts.push(signals.investorConcern);
    } else if (signals.relatedSector) {
      parts.push(`${signals.relatedSector} 비중이 높다면 리스크 노출 수준을 점검하세요.`);
    } else {
      parts.push(generateBeginnerCaution(item));
    }

    parts.push(cta);
    return parts.join('\n\n');
  }

  const lead = generateNewsLead(item);
  const impact = generateWhyItMatters(item);
  const caution = generateBeginnerCaution(item);
  return [lead, impact, caution, cta].join('\n\n');
}

// ── 30s Reels script ──────────────────────────────────────────────────────

export function generateScript30s(item: ScoredItem): string {
  const signals = extractEventSignals(item.title, item.snippet);
  const ticker = item.relatedTickers[0] ? getTickerLabel(item.relatedTickers[0]) : '이 종목';
  const cta = generateCTA(item);
  const caution = BEGINNER_CAUTION[item.category];

  let opener: string;
  if (signals.mainConflict && signals.macroImpact) {
    opener = `${signals.mainConflict}.\n${buildEventHook(signals)}\n\n${signals.macroImpact}.`;
  } else if (signals.mainConflict) {
    opener = `${signals.mainConflict}.\n${buildEventHook(signals)}`;
  } else {
    opener = generateNewsLead(item);
  }

  switch (item.category) {
    case 'earnings':
      return `${opener}\n\n실적이 좋으면 주가가 올라야 할 것 같죠?\n꼭 그렇지 않습니다.\n\n실적 발표는 시장의 기대치와의 비교입니다.\n이미 많은 투자자들이 기대를 선반영했다면,\n주가는 오히려 "사실 확인 후 매도" 흐름을 보일 수 있습니다.\n\n주의: ${caution}\n\n${ticker} 비중이 높다면 집중도를 먼저 점검하세요.\n\n${cta}`;
    case 'macro':
      return `${opener}\n\n주식, 채권, 달러 자산까지\n모든 자산군에 직접적인 영향을 줍니다.\n\n주의: ${caution}\n\n지금 내 포트폴리오, 이 변화에 얼마나 노출돼 있나요?\n주식·채권·달러 자산 비중, 균형이 맞나요?\n\n${cta}`;
    case 'fx':
      return `${opener}\n\n해외 주식이나 달러 자산을 보유하고 계신가요?\n환율 변화는 보이지 않는 포트폴리오 리스크입니다.\n환율이 오르면 해외 자산의 원화 환산 가치도 달라집니다.\n\n주의: ${caution}\n\n해외 비중이 있다면 오늘 한 번 달러 노출 수준을 점검해보세요.\n\n${cta}`;
    case 'tech': {
      const sectorName = signals.relatedSector ?? 'AI·반도체';
      return `${opener}\n\n${sectorName} 비중이 포트폴리오에서 얼마나 되시나요?\n이런 뉴스가 나올 때마다 가장 크게 흔들리는 건\n섹터 편중 포트폴리오입니다.\n\n한 섹터에 너무 많은 비중이 쏠려 있으면\n해당 섹터 이슈에 지나치게 민감해집니다.\n\n주의: ${caution}\n\n섹터 편중 여부를 먼저 확인하세요.\n\n${cta}`;
    }
    case 'psychology': {
      const emotionWord = signals.emotionalAngle === '공포' ? '공포에 패닉셀' : 'FOMO에 추격 매수';
      return `${opener}\n\n이럴 때 대부분의 투자자들이 어떻게 행동할까요?\n${emotionWord}하거나, 그 반대로 얼어붙거나.\n이 두 가지 모두 장기 수익률을 갉아먹는 행동입니다.\n\n흔들릴 때일수록 내 목표 비중으로 돌아오세요.\n비중이 쏠렸다면 일부 조정, 비중이 낮다면 조금씩 채우기.\n그게 리밸런싱입니다.\n\n${cta}`;
    }
    case 'sector':
      return `${opener}\n\n섹터 이슈가 터졌을 때 가장 먼저 확인해야 할 건\n내 포트폴리오에서 해당 섹터 비중입니다.\n\n비중이 낮다면 시장 평균 수준의 영향,\n비중이 높다면 리스크가 집중된 상태입니다.\n\n주의: ${caution}\n\n${cta}`;
    default:
      return `${opener}\n\n이런 뉴스를 볼 때 대부분의 투자자들은\n"주가에 어떤 영향이 있을까?"를 먼저 생각합니다.\n\n하지만 장기 투자자가 먼저 봐야 할 건\n"이 뉴스가 내 포트폴리오 비중과\n리스크 수준에 어떤 의미인가?"입니다.\n\n수익률보다 비중, 종목보다 구조를 보는 습관.\n그게 장기 투자 성공의 핵심입니다.\n\n${cta}`;
  }
}

// ── Subtitle lines (5 lines for reel visuals) ─────────────────────────────

const SUBTITLE_TAILS: Record<Category, string[]> = {
  earnings: ['실적보다 먼저 볼 것', '내 포트폴리오 비중', 'PoBalance에서 집중도 점검'],
  macro: ['내 자산에 어떤 영향?', '주식·채권 비중 균형 점검', 'PoBalance에서 확인'],
  fx: ['환율 = 보이지 않는 리스크', '달러 노출 비중 점검 타이밍', 'PoBalance에서 확인'],
  tech: ['섹터 편중 체크 타이밍', '비중이 쏠렸다면 리스크', 'PoBalance에서 섹터 점검'],
  psychology: ['감정 기반 매매의 함정', '목표 비중으로 돌아오세요', 'PoBalance에서 점검'],
  sector: ['비중이 높다면 리스크 집중', '감정 말고 비중으로 판단', 'PoBalance에서 확인'],
  other: ['뉴스보다 먼저 볼 것', '내 포트폴리오 비중', 'PoBalance에서 점검'],
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

  let line1: string;
  if (signals.mainConflict) {
    line1 = signals.mainConflict;
  } else {
    const event = detectMarketEvent(item.title, item.category);
    line1 = event ?? (tickerStr ? `${tickerStr} 소식` : item.title.slice(0, 20) + (item.title.length > 20 ? '…' : ''));
  }

  let line2: string;
  if (signals.macroImpact) {
    const short = signals.macroImpact.replace(/\s*—.*$/, '').trim();
    line2 = short.length > 18 ? short.slice(0, 18) + '…' : short;
  } else if (signals.investorConcern) {
    const short = signals.investorConcern.replace(/\s*—.*$/, '').trim();
    line2 = short.length > 18 ? short.slice(0, 18) + '…' : short;
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
  const cta = generateCTA(item);
  const lines: string[] = [];

  if (item.category === 'earnings') {
    lines.push(`${ticker} 실적 발표 ✅`);
    lines.push('');
    lines.push('하지만 실적보다 먼저 봐야 할 건');
    lines.push("내 포트폴리오의 '비중'입니다.");
    lines.push('');
    lines.push('한 종목이 전체 수익을 결정하는 구조라면');
    lines.push('그건 집중 리스크입니다.');
    lines.push('');
    lines.push('지금 내 포트폴리오, 괜찮으신가요?');
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
    lines.push('금리·환율·CPI');
    lines.push('이 숫자들이 왜 중요한지 아시나요?');
    lines.push('');
    lines.push('내 포트폴리오가 이 변수에 얼마나 노출됐는지');
    lines.push('한 번도 확인 안 해보셨다면');
    lines.push('오늘이 딱 좋은 타이밍입니다.');
  } else if (item.category === 'fx') {
    lines.push('달러가 움직이면 해외 주식도 움직입니다.');
    lines.push('');
    lines.push('환율은 보이지 않는 포트폴리오 리스크입니다.');
    lines.push('해외 비중이 있다면 오늘 한 번 확인해보세요.');
  } else if (item.category === 'tech') {
    lines.push(`${ticker} 관련 소식이 나왔습니다.`);
    lines.push('');
    lines.push('AI·반도체 비중이 높은 포트폴리오는');
    lines.push('이런 뉴스 하나에 크게 흔들릴 수 있습니다.');
    lines.push('');
    lines.push('섹터 편중, 지금 내 포트폴리오는 어떤가요?');
  } else {
    lines.push(`${ticker}에 대한 소식이 있습니다.`);
    lines.push('');
    lines.push('수익률만 보지 말고');
    lines.push("'비중'과 '리스크'를 함께 보는 습관,");
    lines.push('장기 투자자에게 가장 중요한 것입니다.');
  }

  lines.push('');
  lines.push(`👉 ${cta}`);
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

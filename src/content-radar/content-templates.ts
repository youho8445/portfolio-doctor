import { ScoredItem, Category, Market, ContentType } from './content-scorer';

// ── Angle templates ────────────────────────────────────────────────────────
// Maps category → market → angle string.
// Placeholders: {ticker} = first relatedTicker or '이 종목'

const ANGLE_TEMPLATES: Record<Category, Partial<Record<Market | 'default', string>>> = {
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

// ── Hook templates ─────────────────────────────────────────────────────────

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

// ── Caption templates ──────────────────────────────────────────────────────

function buildCaption(item: ScoredItem): string {
  const ticker = item.relatedTickers[0] ?? null;
  const tickerLabel = ticker ? getTickerLabel(ticker) : '이 소식';

  const lines: string[] = [];

  if (item.category === 'earnings') {
    lines.push(`${tickerLabel} 실적 발표 ✅`);
    lines.push('');
    lines.push('하지만 실적보다 먼저 봐야 할 건');
    lines.push("내 포트폴리오의 '비중'입니다.");
    lines.push('');
    lines.push('한 종목이 전체 수익을 결정하는 구조라면');
    lines.push('그건 투자가 아니라 도박에 가깝습니다.');
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
    lines.push(`${tickerLabel} 관련 소식이 나왔습니다.`);
    lines.push('');
    lines.push('AI·반도체 비중이 높은 포트폴리오는');
    lines.push('이런 뉴스 하나에 크게 흔들릴 수 있습니다.');
    lines.push('');
    lines.push('섹터 편중, 지금 내 포트폴리오는 어떤가요?');
  } else {
    lines.push(`${tickerLabel}에 대한 소식이 있습니다.`);
    lines.push('');
    lines.push('수익률만 보지 말고');
    lines.push("'비중'과 '리스크'를 함께 보는 습관,");
    lines.push('장기 투자자에게 가장 중요한 것입니다.');
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

function getTickerHashtag(ticker: string): string | null {
  const labelMap: Record<string, string> = {
    'NVDA': '#엔비디아',
    'TSLA': '#테슬라',
    'AAPL': '#애플',
    'MSFT': '#마이크로소프트',
    'GOOGL': '#구글',
    'META': '#메타',
    'AMZN': '#아마존',
    'AMD': '#AMD',
    'AVGO': '#브로드컴',
    'PLTR': '#팔란티어',
    '005930.KS': '#삼성전자',
    '000660.KS': '#SK하이닉스',
    '005380.KS': '#현대차',
    '000270.KS': '#기아',
    '035420.KS': '#네이버',
    '035720.KS': '#카카오',
    '373220.KS': '#LG에너지솔루션',
  };
  return labelMap[ticker] ?? null;
}

function getTickerLabel(ticker: string): string {
  const labelMap: Record<string, string> = {
    'NVDA': '엔비디아',
    'TSLA': '테슬라',
    'AAPL': '애플',
    'MSFT': '마이크로소프트',
    'GOOGL': '구글',
    'META': '메타',
    'AMZN': '아마존',
    'AMD': 'AMD',
    'AVGO': '브로드컴',
    'PLTR': '팔란티어',
    '005930.KS': '삼성전자',
    '000660.KS': 'SK하이닉스',
    '005380.KS': '현대차',
    '000270.KS': '기아',
    '035420.KS': 'NAVER',
    '035720.KS': '카카오',
    '373220.KS': 'LG에너지솔루션',
    '012450.KS': '한화에어로스페이스',
    '267260.KS': 'HD현대일렉트릭',
    '034020.KS': '두산에너빌리티',
  };
  return labelMap[ticker] ?? ticker;
}

// ── Public generation API ──────────────────────────────────────────────────

export function generateAngle(item: ScoredItem): string {
  const templates = ANGLE_TEMPLATES[item.category];
  const template = templates[item.market] ?? templates['default'] ?? '포트폴리오 비중과 리스크를 점검해보세요.';
  const ticker = item.relatedTickers[0] ? getTickerLabel(item.relatedTickers[0]) : '이 종목';
  return template.replace(/{ticker}/g, ticker);
}

export function generateHook(item: ScoredItem): string {
  const options = HOOK_TEMPLATES[item.contentType];
  // Pick deterministically by contentScore mod length
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

export function generateCaption(item: ScoredItem): string {
  return buildCaption(item);
}

export function generateGlossary(item: ScoredItem): string[] {
  return GLOSSARY_BY_CATEGORY[item.category] ?? ['포트폴리오 점검', '비중 관리'];
}

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

export interface EtfCandidate {
  ticker: string;
  label: string;
  hint: string; // full hint sentence for rebalanceHints in insights engine
}

const KR_POOL: EtfCandidate[] = [
  {
    ticker: '069500.KS',
    label: 'KODEX 200 (한국 전체 시장)',
    hint: 'KODEX 200 같은 "한국 계좌에서 접근하기 쉬운 시장 대표 ETF"를 10~20% 추가하면 수백 개 회사에 자동으로 분산돼요',
  },
  {
    ticker: '360750.KS',
    label: 'TIGER 미국S&P500 (미국 시장 연동)',
    hint: 'TIGER 미국S&P500 같은 "한국 계좌에서 미국 시장에 투자하는 ETF"를 10~20% 추가하면 자동으로 분산돼요',
  },
  {
    ticker: '379800.KS',
    label: 'KODEX 미국S&P500TR (미국 시장 연동)',
    hint: 'KODEX 미국S&P500TR 같은 "한국 계좌에서 미국 시장에 투자하는 ETF"를 10~20% 추가하면 자동으로 분산돼요',
  },
];

const US_BROAD_POOL: EtfCandidate[] = [
  {
    ticker: 'VTI',
    label: 'VTI (미국 전체 주식시장)',
    hint: 'VTI 같은 "미국 전체 시장 ETF"를 10~20% 추가하면 수백 개 회사에 자동으로 분산돼요',
  },
  {
    ticker: 'VOO',
    label: 'VOO (미국 대표 500개 기업)',
    hint: 'VOO 같은 "미국 전체 시장 ETF"를 10~20% 추가하면 수백 개 회사에 자동으로 분산돼요',
  },
  {
    ticker: 'SPY',
    label: 'SPY (미국 대표 500개 기업)',
    hint: 'SPY 같은 "미국 전체 시장 ETF"를 10~20% 추가하면 수백 개 회사에 자동으로 분산돼요',
  },
];

const QQQ_CANDIDATE: EtfCandidate = {
  ticker: 'QQQ',
  label: 'QQQ (미국 대형 기술주)',
  hint: 'QQQ 같은 "미국 기술주 ETF"를 10~20% 추가하면 분산도가 높아져요',
};

const TECH_SECTORS = new Set(['Information Technology', 'Technology']);
const TECH_HEAVY_THRESHOLD = 50;

function tickerSeed(tickers: string[]): number {
  const s = [...tickers].sort().join('');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function pickEtf(params: {
  nonCashTickers: string[];
  isKrHeavy: boolean;
  topSectorName: string;
  topSectorWeight: number;
  isSingleStock: boolean;
}): EtfCandidate {
  const { nonCashTickers, isKrHeavy, topSectorName, topSectorWeight, isSingleStock } = params;
  const seed = tickerSeed(nonCashTickers);

  if (isKrHeavy) {
    return KR_POOL[seed % KR_POOL.length];
  }

  // Single-stock US portfolio → always VTI for broadest diversification
  if (isSingleStock) {
    return US_BROAD_POOL[0];
  }

  const isTechHeavy = TECH_SECTORS.has(topSectorName) && topSectorWeight >= TECH_HEAVY_THRESHOLD;
  const pool = isTechHeavy ? US_BROAD_POOL : [...US_BROAD_POOL, QQQ_CANDIDATE];
  return pool[seed % pool.length];
}

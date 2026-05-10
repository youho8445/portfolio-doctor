'use client';

import { useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
export type InvestorStyle = 'conservative' | 'balanced' | 'growth' | 'aggressive';
type MarketPref = 'KR' | 'US' | 'both';
type ProductPref = 'etf' | 'stock' | 'mixed' | 'any';
type AssetType = 'etf' | 'stock' | 'bond_etf';
type Step = 'intro' | 0 | 1 | 2 | 'market' | 'product' | 'amount' | 'result';

export interface BeginnerSuggestion {
  ticker: string;
  name: string;
  desc: string;
  weight: number;
  amountKRW: number;
  priceUSD: number | null;
  priceKRW: number | null;
  suggestedShares: number | null;
  canAfford: boolean;
  reason: string;
}

export interface BeginnerResult {
  style: InvestorStyle;
  styleName: string;
  stockRatio: number;
  safeRatio: number;
  investAmount: number;
  usedAmount: number;
  remainingCash: number;
  suggestions: BeginnerSuggestion[];
  unaffordable: BeginnerSuggestion[];
  warnings: string[];
  marketPref: MarketPref;
  productPref: ProductPref;
}

interface AssetDef {
  ticker: string;
  nameKo: string;
  market: 'KR' | 'US';
  type: AssetType;
  desc: string;
  scores: Record<InvestorStyle, number>;
}

interface Props {
  onClose: () => void;
  onStart: (result: BeginnerResult) => void;
  accentHex?: string;
  accentLight?: string;
  usdKrw?: number;
}

// ── Style metadata ─────────────────────────────────────────────────────────────
const STYLE_META: Record<InvestorStyle, { label: string; emoji: string; color: string; bg: string; stockRatio: number; safeRatio: number }> = {
  conservative: { label: '안정형',  emoji: '🛡️', color: '#0284c7', bg: '#e0f2fe', stockRatio: 25, safeRatio: 75 },
  balanced:     { label: '균형형',  emoji: '⚖️', color: '#7c3aed', bg: '#ede9fe', stockRatio: 55, safeRatio: 45 },
  growth:       { label: '성장형',  emoji: '🌱', color: '#0891b2', bg: '#e0f9ff', stockRatio: 75, safeRatio: 25 },
  aggressive:   { label: '공격형',  emoji: '🚀', color: '#059669', bg: '#d1fae5', stockRatio: 90, safeRatio: 10 },
};

// ── Asset Universe ─────────────────────────────────────────────────────────────
const UNIVERSE: AssetDef[] = [
  // US Bond/Safe ETFs
  { ticker: 'SGOV',      nameKo: '초단기 미국채 ETF',     market: 'US', type: 'bond_etf', desc: '만기 0~3개월 미국 국채, 원금 안전성 최우선',             scores: { conservative: 9, balanced: 4, growth: 1, aggressive: 0 } },
  { ticker: 'BND',       nameKo: '미국 전체채권 ETF',      market: 'US', type: 'bond_etf', desc: '미국 전체 채권 시장 분산, 안정적 이자 수익',             scores: { conservative: 8, balanced: 5, growth: 2, aggressive: 0 } },
  { ticker: 'TLT',       nameKo: '미국 장기국채 ETF',      market: 'US', type: 'bond_etf', desc: '20년+ 미국 국채, 금리 하락기에 가격 상승',               scores: { conservative: 7, balanced: 3, growth: 1, aggressive: 0 } },
  // US Equity ETFs
  { ticker: 'SCHD',      nameKo: '미국 배당주 ETF',        market: 'US', type: 'etf',      desc: '미국 우량 고배당주 100개, 꾸준한 배당 수익',             scores: { conservative: 8, balanced: 7, growth: 3, aggressive: 1 } },
  { ticker: 'VYM',       nameKo: '고배당 ETF',             market: 'US', type: 'etf',      desc: '대형 고배당주 분산, 안정적 인컴 추구',                   scores: { conservative: 7, balanced: 6, growth: 2, aggressive: 1 } },
  { ticker: 'VOO',       nameKo: 'S&P500 ETF',             market: 'US', type: 'etf',      desc: '미국 500대 기업 한 번에, 미국 경제 성장과 함께',         scores: { conservative: 6, balanced: 9, growth: 6, aggressive: 3 } },
  { ticker: 'VTI',       nameKo: '미국 전체시장 ETF',      market: 'US', type: 'etf',      desc: '미국 전체 주식(대·중·소형주) 한 번에',                   scores: { conservative: 5, balanced: 8, growth: 5, aggressive: 3 } },
  { ticker: 'QQQ',       nameKo: '나스닥100 ETF',          market: 'US', type: 'etf',      desc: '애플·엔비디아·MS 등 기술 선도 100개',                   scores: { conservative: 3, balanced: 7, growth: 9, aggressive: 6 } },
  { ticker: 'VGT',       nameKo: '미국 기술주 ETF',        market: 'US', type: 'etf',      desc: '반도체·소프트웨어·클라우드 IT섹터 집중',                 scores: { conservative: 2, balanced: 5, growth: 8, aggressive: 6 } },
  // US Stable Large-caps
  { ticker: 'KO',        nameKo: '코카콜라',               market: 'US', type: 'stock',    desc: '140년 역사 소비재 1위, 꾸준한 배당 지급',                scores: { conservative: 7, balanced: 5, growth: 2, aggressive: 1 } },
  { ticker: 'JNJ',       nameKo: '존슨앤존슨',             market: 'US', type: 'stock',    desc: '헬스케어·제약·소비재 글로벌 대형주, 배당 귀족',           scores: { conservative: 7, balanced: 5, growth: 2, aggressive: 1 } },
  { ticker: 'PG',        nameKo: 'P&G',                   market: 'US', type: 'stock',    desc: '팸퍼스·질레트 생필품 세계 1위, 방어적 종목',             scores: { conservative: 7, balanced: 5, growth: 2, aggressive: 1 } },
  { ticker: 'JPM',       nameKo: 'JP모건',                 market: 'US', type: 'stock',    desc: '미국 최대 은행, 금리 인상기 수혜 금융주',                scores: { conservative: 5, balanced: 6, growth: 4, aggressive: 3 } },
  // US Growth Large-caps
  { ticker: 'AAPL',      nameKo: '애플',                   market: 'US', type: 'stock',    desc: '아이폰·서비스 생태계, 세계 최대 시총 기업',             scores: { conservative: 4, balanced: 8, growth: 7, aggressive: 5 } },
  { ticker: 'MSFT',      nameKo: '마이크로소프트',          market: 'US', type: 'stock',    desc: '클라우드(Azure)·오피스·AI 코파일럿 선두',               scores: { conservative: 4, balanced: 8, growth: 8, aggressive: 6 } },
  { ticker: 'GOOGL',     nameKo: '알파벳(구글)',            market: 'US', type: 'stock',    desc: '검색·유튜브·클라우드·AI 핵심 빅테크',                   scores: { conservative: 3, balanced: 7, growth: 8, aggressive: 6 } },
  { ticker: 'AMZN',      nameKo: '아마존',                 market: 'US', type: 'stock',    desc: '이커머스+AWS 클라우드 2위, AI 인프라 성장',             scores: { conservative: 2, balanced: 6, growth: 8, aggressive: 7 } },
  { ticker: 'META',      nameKo: '메타(페이스북)',           market: 'US', type: 'stock',    desc: '인스타·왓츠앱, 광고+AI+메타버스 성장',                  scores: { conservative: 2, balanced: 6, growth: 8, aggressive: 7 } },
  { ticker: 'NVDA',      nameKo: '엔비디아',               market: 'US', type: 'stock',    desc: 'AI 반도체 독보적 1위, GPU·데이터센터 폭발 성장',        scores: { conservative: 1, balanced: 4, growth: 9, aggressive: 10 } },
  { ticker: 'TSLA',      nameKo: '테슬라',                 market: 'US', type: 'stock',    desc: '전기차 선구자, 로보택시·에너지 사업 고변동성',           scores: { conservative: 0, balanced: 3, growth: 6, aggressive: 9 } },
  { ticker: 'AMD',       nameKo: 'AMD',                   market: 'US', type: 'stock',    desc: 'AI CPU·GPU 고성장, 인텔·엔비디아 양쪽 추격',            scores: { conservative: 1, balanced: 4, growth: 8, aggressive: 9 } },
  // Korean ETFs
  { ticker: '069500.KS', nameKo: 'KODEX 200',             market: 'KR', type: 'etf',      desc: '코스피200 추종, 한국 대표 기업 200개 분산 투자',         scores: { conservative: 6, balanced: 7, growth: 4, aggressive: 2 } },
  { ticker: '379800.KS', nameKo: 'KODEX 미국S&P500',      market: 'KR', type: 'etf',      desc: '원화로 미국 S&P500 투자 (국내 상장)',                   scores: { conservative: 5, balanced: 8, growth: 6, aggressive: 3 } },
  { ticker: '133690.KS', nameKo: 'TIGER 미국S&P500',      market: 'KR', type: 'etf',      desc: '원화로 미국 S&P500 투자, 환전 불필요',                  scores: { conservative: 5, balanced: 7, growth: 5, aggressive: 3 } },
  // Korean Large-caps
  { ticker: '005930.KS', nameKo: '삼성전자',              market: 'KR', type: 'stock',    desc: '반도체·스마트폰 세계 1위, 한국 대표 대형주',             scores: { conservative: 5, balanced: 7, growth: 6, aggressive: 5 } },
  { ticker: '000660.KS', nameKo: 'SK하이닉스',            market: 'KR', type: 'stock',    desc: 'HBM(AI 메모리) 핵심 수혜주, 메모리 글로벌 2위',         scores: { conservative: 3, balanced: 5, growth: 8, aggressive: 8 } },
  { ticker: '005380.KS', nameKo: '현대차',                market: 'KR', type: 'stock',    desc: '전기차·수소차 전환 중인 글로벌 완성차 5위',             scores: { conservative: 4, balanced: 6, growth: 5, aggressive: 4 } },
  { ticker: '035420.KS', nameKo: 'NAVER',                 market: 'KR', type: 'stock',    desc: '국내 검색 1위, 커머스·클라우드·AI 성장',                scores: { conservative: 3, balanced: 5, growth: 7, aggressive: 6 } },
  { ticker: '051910.KS', nameKo: 'LG화학',                market: 'KR', type: 'stock',    desc: '배터리 소재·석유화학, 전기차 공급망 핵심',              scores: { conservative: 3, balanced: 5, growth: 6, aggressive: 6 } },
];

// ── Questions ─────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: 'loss', emoji: '📉',
    question: '주식이 갑자기 20% 떨어졌어요. 어떻게 하실 건가요?',
    options: [
      { label: '당장 팔아서 손실을 막겠다', score: 0 },
      { label: '걱정되지만 일단 지켜보겠다', score: 1 },
      { label: '더 살 수 있는 기회라고 생각한다', score: 2 },
    ],
  },
  {
    id: 'horizon', emoji: '⏳',
    question: '이 돈, 언제쯤 쓸 것 같나요?',
    options: [
      { label: '1년 안에 쓸 수도 있다', score: 0 },
      { label: '2~3년 뒤쯤 필요할 것 같다', score: 1 },
      { label: '5년 이상 묻어둘 수 있다', score: 2 },
    ],
  },
  {
    id: 'goal', emoji: '🎯',
    question: '투자로 기대하는 게 뭔가요?',
    options: [
      { label: '원금만 지키면 충분하다', score: 0 },
      { label: '예금보다 좀 더 벌고 싶다', score: 1 },
      { label: '크게 불려서 목돈을 만들고 싶다', score: 2 },
    ],
  },
];

const QUICK_AMOUNTS = [
  { label: '50만', value: 500_000 },
  { label: '100만', value: 1_000_000 },
  { label: '300만', value: 3_000_000 },
  { label: '500만', value: 5_000_000 },
  { label: '1000만', value: 10_000_000 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreToStyle(total: number): InvestorStyle {
  if (total <= 1) return 'conservative';
  if (total <= 3) return 'balanced';
  if (total <= 5) return 'growth';
  return 'aggressive';
}

function isKR(ticker: string) {
  return ticker.endsWith('.KS') || ticker.endsWith('.KQ');
}

function fmtKRW(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e8) return `${(n / 1e8).toFixed(1)}억원`;
  if (abs >= 1e4) return `${Math.round(n / 1e4).toLocaleString()}만원`;
  return `${n.toLocaleString()}원`;
}

function selectCandidates(
  style: InvestorStyle,
  market: MarketPref,
  product: ProductPref,
  excludes: string[],
): AssetDef[] {
  const excSet = new Set(excludes.map((t) => t.toUpperCase()));
  let pool = UNIVERSE.filter((a) => {
    if (excSet.has(a.ticker.toUpperCase())) return false;
    if (market === 'KR' && a.market !== 'KR') return false;
    if (market === 'US' && a.market !== 'US') return false;
    if (product === 'etf' && a.type === 'stock') return false;
    if (product === 'stock' && a.type !== 'stock') return false;
    return true;
  });

  pool.sort((a, b) => b.scores[style] - a.scores[style]);

  // ensure at least 1 safe asset for conservative/balanced
  const hasSafe = pool.slice(0, 5).some((a) => a.type === 'bond_etf');
  if (!hasSafe && (style === 'conservative' || style === 'balanced') && product !== 'stock') {
    const safe = UNIVERSE.find((a) => a.type === 'bond_etf' && (market === 'both' || a.market === 'US') && !excSet.has(a.ticker));
    if (safe) pool = [safe, ...pool.filter((a) => a.ticker !== safe.ticker)];
  }

  return pool.slice(0, 6);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BeginnerGuide({ onClose, onStart, accentHex = '#7c3aed', accentLight = '#ede9fe', usdKrw = 1400 }: Props) {
  const [step, setStep] = useState<Step>('intro');
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [market, setMarket] = useState<MarketPref | null>(null);
  const [product, setProduct] = useState<ProductPref | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [result, setResult] = useState<BeginnerResult | null>(null);

  const totalScore = answers.reduce((s, a) => s + a, 0);
  const style = scoreToStyle(totalScore);
  const styleMeta = STYLE_META[style];
  const currentQ = typeof step === 'number' ? QUESTIONS[step] : null;
  const investAmount = Number(amountInput.replace(/,/g, '')) || 0;

  const excludes = excludeInput.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);

  const candidates = (market && product)
    ? selectCandidates(style, market, product, excludes)
    : [];

  const progress =
    step === 'intro' ? 0 :
    step === 'result' ? 100 :
    step === 'amount' ? 88 :
    step === 'product' ? 75 :
    step === 'market' ? 62 :
    (((step as number) + 1) / 3) * 50;

  // Fetch prices when entering result step
  useEffect(() => {
    if (step !== 'result' || candidates.length === 0) return;
    setPricesLoading(true);
    const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') ?? '') : '';
    Promise.all(
      candidates.map((c) =>
        fetch(`${api}/securities/${encodeURIComponent(c.ticker)}/quote`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((r) => r.ok ? r.json() : null)
          .then((d) => [c.ticker, d?.price ?? null] as const)
          .catch(() => [c.ticker, null] as const)
      )
    ).then((entries) => {
      const map: Record<string, number | null> = {};
      for (const [t, p] of entries) map[t] = p;
      setPrices(map);
    }).finally(() => setPricesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Build allocation once prices arrive
  useEffect(() => {
    if (step !== 'result' || pricesLoading || candidates.length === 0 || investAmount <= 0) return;

    const totalScore2 = candidates.reduce((s, c) => s + c.scores[style], 0);
    const warnings: string[] = [];

    const items: BeginnerSuggestion[] = candidates.map((c) => {
      const scoreWeight = totalScore2 > 0 ? c.scores[style] / totalScore2 : 1 / candidates.length;
      const targetKRW = Math.round(scoreWeight * investAmount);
      const rawPrice = prices[c.ticker] ?? null;
      const priceKRW = rawPrice ? (isKR(c.ticker) ? rawPrice : Math.round(rawPrice * usdKrw)) : null;
      const priceUSD = rawPrice && !isKR(c.ticker) ? rawPrice : null;

      const canAfford = priceKRW != null && priceKRW > 0 && targetKRW >= priceKRW;
      const qty = canAfford ? Math.floor(targetKRW / priceKRW!) : 0;
      const usedKRW = qty * (priceKRW ?? 0);

      let reason = '';
      if (rawPrice === null) reason = '가격 조회 실패 (조회 후 수동 추가 가능)';
      else if (!canAfford) reason = `1주 매수 최소 ${fmtKRW(priceKRW!)} 필요`;
      else reason = `${qty}주 · 실제 사용 ${fmtKRW(usedKRW)}`;

      return {
        ticker: c.ticker,
        name: c.nameKo,
        desc: c.desc,
        weight: Math.round(scoreWeight * 100),
        amountKRW: usedKRW,
        priceUSD,
        priceKRW,
        suggestedShares: qty || null,
        canAfford,
        reason,
      };
    });

    const executable = items.filter((i) => i.canAfford && i.suggestedShares! > 0);
    const unaffordable = items.filter((i) => !i.canAfford || !i.suggestedShares);
    const usedAmount = executable.reduce((s, i) => s + i.amountKRW, 0);
    const remainingCash = investAmount - usedAmount;

    if (unaffordable.some((i) => i.priceKRW && i.priceKRW > investAmount * 0.3))
      warnings.push('일부 종목은 현재 투자금으로 1주 매수가 어렵습니다.');
    if (!isKR(candidates[0]?.ticker ?? '') && market !== 'KR')
      warnings.push('소수점 매매를 지원하는 증권사를 이용하면 더 정교하게 구성할 수 있습니다.');
    if (product === 'stock' && !executable.some((i) => i.ticker.includes('.KS') || ['VOO','QQQ','VTI','BND','SCHD'].includes(i.ticker)))
      warnings.push('ETF를 제외하면 변동성이 커질 수 있습니다.');
    if (remainingCash > investAmount * 0.4)
      warnings.push(`투자금의 ${Math.round(remainingCash / investAmount * 100)}%가 현금으로 남습니다. 투자금을 늘리거나 더 저렴한 자산을 추가해보세요.`);

    setResult({
      style,
      styleName: `${styleMeta.label} 시작 포트폴리오`,
      stockRatio: styleMeta.stockRatio,
      safeRatio: styleMeta.safeRatio,
      investAmount,
      usedAmount,
      remainingCash,
      suggestions: executable,
      unaffordable,
      warnings,
      marketPref: market!,
      productPref: product!,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices, pricesLoading, step]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  function handleQNext() {
    if (selected === null) return;
    const next = [...answers, selected];
    setAnswers(next); setSelected(null);
    const nextIdx = (step as number) + 1;
    if (nextIdx < QUESTIONS.length) setStep(nextIdx as 0 | 1 | 2);
    else setStep('market');
  }

  function handleBack() {
    if (step === 'result')  { setResult(null); setStep('amount'); }
    else if (step === 'amount')  { setStep('product'); }
    else if (step === 'product') { setStep('market'); setProduct(null); }
    else if (step === 'market')  { setStep(2); setAnswers(answers.slice(0, 2)); setSelected(null); setMarket(null); }
    else if (typeof step === 'number' && step > 0) { setStep((step - 1) as 0 | 1 | 2); setAnswers(answers.slice(0, step - 1)); setSelected(null); }
  }

  // ── Shared styles ────────────────────────────────────────────────────────────
  const optBtn = (active: boolean): React.CSSProperties => ({
    border: active ? `2px solid ${accentHex}` : '1.5px solid #e8ecf4',
    background: active ? accentLight : '#f8fafc',
    color: active ? accentHex : '#1c1c1e',
    borderRadius: 16, padding: '12px 14px', cursor: 'pointer',
    textAlign: 'left', width: '100%', transition: 'all 0.15s',
  });

  const navBtn = (primary = false): React.CSSProperties => ({
    flex: 1, borderRadius: 16, padding: '13px 0', fontSize: 14, fontWeight: 700,
    background: primary ? accentHex : '#f1f5f9',
    color: primary ? '#fff' : '#64748b',
    border: 'none', cursor: 'pointer',
  });

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col" style={{ background: '#ffffff', maxHeight: '92vh' }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌱</span>
            <span className="font-bold text-sm" style={{ color: '#1c1c1e' }}>시작 포트폴리오 만들기</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#f1f5f9', color: '#64748b' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Progress */}
        {step !== 'intro' && (
          <div className="px-5 pb-2 shrink-0">
            <div className="h-1.5 rounded-full" style={{ background: '#f1f5f9' }}>
              <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: accentHex }} />
            </div>
            <div className="text-[10px] mt-1 text-right font-medium" style={{ color: '#94a3b8' }}>
              {step === 'result' ? '완료' :
               step === 'amount' ? '마지막 단계' :
               step === 'product' ? '4 / 5' :
               step === 'market' ? '3 / 5' :
               `${(step as number) + 1} / 5`}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-5 pb-5 overflow-y-auto flex-1">

          {/* ── 인트로 ── */}
          {step === 'intro' && (
            <div className="text-center pt-3">
              <div className="text-5xl mb-3">📊</div>
              <h2 className="font-black text-xl mb-2" style={{ color: '#1c1c1e' }}>내 투자금으로 가능한<br/>시작 포트폴리오</h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#64748b' }}>
                5가지 질문으로 성향을 파악하고,<br/>
                실제로 살 수 있는 구성을 계산해드려요.
              </p>
              <div className="rounded-2xl p-4 mb-4 text-left" style={{ background: '#f8fafc', border: '1px solid #e8ecf4' }}>
                {[
                  { step: '01', text: '투자 성향 3가지 질문' },
                  { step: '02', text: '선호 시장 (한국 / 미국 / 둘다)' },
                  { step: '03', text: '선호 상품 (ETF / 개별주 / 혼합)' },
                  { step: '04', text: '투자 금액 입력' },
                  { step: '05', text: '실제 살 수 있는 수량 계산' },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-3 mb-2 last:mb-0">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: accentLight, color: accentHex }}>{s.step}</span>
                    <span className="text-xs font-medium" style={{ color: '#475569' }}>{s.text}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl px-3 py-2 mb-4 text-[11px]" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                ⚠️ 참고용 예시 구성이며, 투자 결과를 보장하지 않아요.
              </div>
              <button onClick={() => setStep(0)} className="w-full rounded-2xl py-3.5 text-sm font-bold text-white" style={{ background: accentHex }}>
                시작하기 →
              </button>
            </div>
          )}

          {/* ── 질문 ── */}
          {currentQ && (
            <div className="pt-2">
              <div className="text-3xl mb-3 text-center">{currentQ.emoji}</div>
              <h2 className="font-bold text-base text-center mb-5 leading-snug" style={{ color: '#1c1c1e' }}>{currentQ.question}</h2>
              <div className="space-y-2.5 mb-5">
                {currentQ.options.map((opt, i) => (
                  <button key={i} onClick={() => setSelected(opt.score)} style={optBtn(selected === opt.score)}>
                    <span className="inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold mr-2.5"
                      style={{ background: selected === opt.score ? accentHex : '#e8ecf4', color: selected === opt.score ? 'white' : '#94a3b8' }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm">{opt.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {(step as number) > 0 && <button onClick={handleBack} style={navBtn()}>← 이전</button>}
                <button onClick={handleQNext} disabled={selected === null} style={{ ...navBtn(true), opacity: selected === null ? 0.4 : 1 }}>다음 →</button>
              </div>
            </div>
          )}

          {/* ── 시장 선택 ── */}
          {step === 'market' && (
            <div className="pt-2">
              <div className="text-3xl mb-3 text-center">🌍</div>
              <h2 className="font-bold text-base text-center mb-5" style={{ color: '#1c1c1e' }}>어떤 시장에 투자하고 싶으세요?</h2>
              <div className="space-y-2.5 mb-5">
                {([
                  { value: 'KR',   emoji: '🇰🇷', title: '한국 주식',       desc: '삼성전자, SK하이닉스, NAVER 등' },
                  { value: 'US',   emoji: '🇺🇸', title: '미국 주식/ETF',   desc: 'S&P500, 나스닥, 애플, 엔비디아 등' },
                  { value: 'both', emoji: '🌐', title: '한국 + 미국 모두', desc: '두 시장에 분산하여 구성' },
                ] as const).map((opt) => (
                  <button key={opt.value} onClick={() => setMarket(opt.value)} style={optBtn(market === opt.value)}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{opt.emoji}</span>
                      <div>
                        <div className="text-sm font-bold">{opt.title}</div>
                        <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{opt.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleBack} style={navBtn()}>← 이전</button>
                <button onClick={() => market && setStep('product')} disabled={!market} style={{ ...navBtn(true), opacity: !market ? 0.4 : 1 }}>다음 →</button>
              </div>
            </div>
          )}

          {/* ── 상품 선택 ── */}
          {step === 'product' && (
            <div className="pt-2">
              <div className="text-3xl mb-3 text-center">💼</div>
              <h2 className="font-bold text-base text-center mb-5" style={{ color: '#1c1c1e' }}>어떤 상품을 원하세요?</h2>
              <div className="space-y-2.5 mb-5">
                {([
                  { value: 'etf',   emoji: '📦', title: 'ETF (분산 펀드)',        desc: '한 번에 여러 종목을 분산 투자, 초보자 추천' },
                  { value: 'stock', emoji: '💎', title: '개별 종목 직접 투자',    desc: '특정 기업을 직접 선택, 높은 변동성' },
                  { value: 'mixed', emoji: '🔀', title: 'ETF + 개별 종목 혼합',   desc: '안정성과 성장성을 동시에 추구' },
                  { value: 'any',   emoji: '🤷', title: '상관없음',               desc: '성향에 맞게 자동으로 최적 구성' },
                ] as const).map((opt) => (
                  <button key={opt.value} onClick={() => setProduct(opt.value)} style={optBtn(product === opt.value)}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{opt.emoji}</span>
                      <div>
                        <div className="text-sm font-bold">{opt.title}</div>
                        <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{opt.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleBack} style={navBtn()}>← 이전</button>
                <button onClick={() => product && setStep('amount')} disabled={!product} style={{ ...navBtn(true), opacity: !product ? 0.4 : 1 }}>다음 →</button>
              </div>
            </div>
          )}

          {/* ── 금액 입력 ── */}
          {step === 'amount' && (
            <div className="pt-2">
              <div className="text-3xl mb-3 text-center">💰</div>
              <h2 className="font-bold text-base text-center mb-1" style={{ color: '#1c1c1e' }}>얼마를 투자하실 건가요?</h2>
              <p className="text-xs text-center mb-4" style={{ color: '#94a3b8' }}>실제로 살 수 있는 수량을 계산해드려요</p>

              <div className="flex flex-wrap gap-2 mb-3">
                {QUICK_AMOUNTS.map((q) => (
                  <button key={q.value} onClick={() => setAmountInput(q.value.toLocaleString())}
                    className="rounded-xl px-3 py-2 text-xs font-bold transition-all"
                    style={{
                      background: amountInput === q.value.toLocaleString() ? accentHex : accentLight,
                      color: amountInput === q.value.toLocaleString() ? 'white' : accentHex,
                      border: `1.5px solid ${accentHex}40`,
                    }}>
                    {q.label}
                  </button>
                ))}
              </div>

              <div className="relative mb-1">
                <input
                  type="text" inputMode="numeric" value={amountInput}
                  onChange={(e) => { const raw = e.target.value.replace(/[^\d]/g, ''); setAmountInput(raw ? Number(raw).toLocaleString() : ''); }}
                  placeholder="직접 입력 (원)"
                  className="w-full rounded-2xl px-4 py-3.5 text-base font-bold text-right outline-none pr-10"
                  style={{ background: '#f8fafc', border: `1.5px solid #e8ecf4`, color: '#1c1c1e' }}
                  onFocus={(e) => (e.target.style.borderColor = accentHex)}
                  onBlur={(e) => (e.target.style.borderColor = '#e8ecf4')}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: '#94a3b8' }}>원</span>
              </div>
              {investAmount > 0 && (
                <div className="text-center text-xs mb-3 font-semibold" style={{ color: accentHex }}>{fmtKRW(investAmount)}</div>
              )}

              <div className="mb-4">
                <label className="block text-[11px] font-semibold mb-1.5" style={{ color: '#94a3b8' }}>제외할 종목 (선택, 쉼표 구분)</label>
                <input
                  type="text" value={excludeInput}
                  onChange={(e) => setExcludeInput(e.target.value)}
                  placeholder="예: TSLA, 005930.KS"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4', color: '#1c1c1e' }}
                  onFocus={(e) => (e.target.style.borderColor = accentHex)}
                  onBlur={(e) => (e.target.style.borderColor = '#e8ecf4')}
                />
              </div>

              <div className="flex gap-2">
                <button onClick={handleBack} style={navBtn()}>← 이전</button>
                <button
                  onClick={() => { setPrices({}); setResult(null); setStep('result'); }}
                  disabled={investAmount <= 0}
                  style={{ ...navBtn(true), opacity: investAmount <= 0 ? 0.4 : 1 }}>
                  계산하기 →
                </button>
              </div>
            </div>
          )}

          {/* ── 결과 ── */}
          {step === 'result' && (
            <div className="pt-2">
              {/* 성향 배지 */}
              <div className="rounded-2xl p-3.5 mb-4 flex items-center gap-3" style={{ background: styleMeta.bg, border: `1.5px solid ${styleMeta.color}30` }}>
                <span className="text-3xl">{styleMeta.emoji}</span>
                <div className="min-w-0">
                  <div className="font-black text-sm" style={{ color: styleMeta.color }}>{styleMeta.label}</div>
                  <div className="text-xs mt-0.5 font-medium" style={{ color: '#475569' }}>
                    주식 {styleMeta.stockRatio}% · 안전자산 {styleMeta.safeRatio}%
                  </div>
                </div>
                {(pricesLoading || !result) && (
                  <div className="ml-auto text-[11px] font-semibold animate-pulse" style={{ color: accentHex }}>가격 조회 중...</div>
                )}
              </div>

              {result && (
                <>
                  {/* 예산 요약 */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-xl p-3 text-center" style={{ background: '#f8fafc', border: '1px solid #e8ecf4' }}>
                      <div className="text-[10px] font-semibold mb-0.5" style={{ color: '#94a3b8' }}>총 예산</div>
                      <div className="text-xs font-black" style={{ color: '#1c1c1e' }}>{fmtKRW(investAmount)}</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <div className="text-[10px] font-semibold mb-0.5" style={{ color: '#059669' }}>실제 사용</div>
                      <div className="text-xs font-black" style={{ color: '#059669' }}>{fmtKRW(result.usedAmount)}</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                      <div className="text-[10px] font-semibold mb-0.5" style={{ color: '#d97706' }}>남는 현금</div>
                      <div className="text-xs font-black" style={{ color: '#d97706' }}>{fmtKRW(result.remainingCash)}</div>
                    </div>
                  </div>

                  {/* 살 수 있는 종목 */}
                  {result.suggestions.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[11px] font-bold mb-2 flex items-center gap-1.5" style={{ color: '#059669' }}>
                        <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-[9px]">✓</span>
                        내 투자금으로 가능한 구성
                      </div>
                      <div className="space-y-2">
                        {result.suggestions.map((sg) => (
                          <div key={sg.ticker} className="rounded-xl p-3" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div className="flex items-start justify-between mb-1.5">
                              <div>
                                <span className="font-black text-sm" style={{ color: '#1c1c1e' }}>{sg.ticker}</span>
                                <span className="ml-1.5 text-xs font-medium" style={{ color: '#475569' }}>{sg.name}</span>
                              </div>
                              <span className="text-xs font-bold rounded-full px-2 py-0.5" style={{ background: accentLight, color: accentHex }}>{sg.weight}%</span>
                            </div>
                            <div className="text-[11px] mb-2" style={{ color: '#94a3b8' }}>{sg.desc}</div>
                            <div className="grid grid-cols-3 gap-1.5">
                              <div className="rounded-lg p-2 text-center" style={{ background: '#f8fafc' }}>
                                <div className="text-[9px] mb-0.5" style={{ color: '#94a3b8' }}>현재 단가</div>
                                <div className="text-[11px] font-bold" style={{ color: '#1c1c1e' }}>
                                  {sg.priceKRW ? fmtKRW(sg.priceKRW) : sg.priceUSD ? `$${sg.priceUSD.toFixed(0)}` : '—'}
                                </div>
                              </div>
                              <div className="rounded-lg p-2 text-center" style={{ background: '#f8fafc' }}>
                                <div className="text-[9px] mb-0.5" style={{ color: '#94a3b8' }}>매수 수량</div>
                                <div className="text-[11px] font-bold" style={{ color: styleMeta.color }}>
                                  {sg.suggestedShares != null ? `${sg.suggestedShares}주` : '—'}
                                </div>
                              </div>
                              <div className="rounded-lg p-2 text-center" style={{ background: '#f8fafc' }}>
                                <div className="text-[9px] mb-0.5" style={{ color: '#94a3b8' }}>사용 금액</div>
                                <div className="text-[11px] font-bold" style={{ color: '#1c1c1e' }}>{fmtKRW(sg.amountKRW)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 살 수 없는 종목 */}
                  {result.unaffordable.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[11px] font-bold mb-2 flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                        <span className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[9px]">×</span>
                        현재 금액으로 어려운 종목
                      </div>
                      <div className="space-y-1.5">
                        {result.unaffordable.map((sg) => (
                          <div key={sg.ticker} className="rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ background: '#f8fafc', border: '1px solid #e8ecf4' }}>
                            <div>
                              <span className="text-xs font-bold" style={{ color: '#64748b' }}>{sg.ticker}</span>
                              <span className="ml-1.5 text-[11px]" style={{ color: '#94a3b8' }}>{sg.name}</span>
                            </div>
                            <div className="text-[10px] font-medium text-right" style={{ color: '#94a3b8', maxWidth: '50%' }}>{sg.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 경고 */}
                  {result.warnings.length > 0 && (
                    <div className="rounded-xl p-3 mb-4 space-y-1.5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                      {result.warnings.map((w, i) => (
                        <div key={i} className="text-[11px] leading-relaxed" style={{ color: '#92400e' }}>⚠️ {w}</div>
                      ))}
                    </div>
                  )}

                  {result.suggestions.length === 0 && (
                    <div className="rounded-xl p-4 mb-4 text-center" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                      <div className="text-sm font-bold mb-1" style={{ color: '#dc2626' }}>살 수 있는 종목이 없어요</div>
                      <div className="text-xs" style={{ color: '#64748b' }}>투자금을 늘리거나 시장/상품 설정을 바꿔보세요</div>
                    </div>
                  )}

                  <div className="rounded-xl px-3 py-2 mb-4 text-[10px] leading-relaxed" style={{ background: '#f8fafc', border: '1px solid #e8ecf4', color: '#94a3b8' }}>
                    * 매수 수량은 소수점 매매 미지원 기준 · 실제 체결 단가와 다를 수 있어요<br/>
                    * 투자 권유가 아닌 참고용 예시 구성입니다
                  </div>

                  <div className="flex gap-2">
                    <button onClick={handleBack} style={{ ...navBtn(), flex: 'none', padding: '13px 16px' }}>← 다시</button>
                    <button
                      onClick={() => result.suggestions.length > 0 && onStart(result)}
                      disabled={result.suggestions.length === 0}
                      style={{ ...navBtn(true), opacity: result.suggestions.length === 0 ? 0.4 : 1 }}>
                      이 구성으로 포트폴리오 만들기 →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

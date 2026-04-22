'use client';

import { useEffect, useState } from 'react';

export type InvestorStyle = 'conservative' | 'balanced' | 'aggressive';

export interface BeginnerSuggestion {
  ticker: string;
  name: string;
  desc: string;
  weight: number;
  amountKRW: number;
  priceUSD: number | null;
  suggestedShares: number | null;
}

export interface BeginnerResult {
  style: InvestorStyle;
  stockRatio: number;
  safeRatio: number;
  investAmount: number;
  suggestions: BeginnerSuggestion[];
}

interface Props {
  onClose: () => void;
  onStart: (result: BeginnerResult) => void;
  accentHex?: string;
  accentLight?: string;
  usdKrw?: number;
}

const QUESTIONS = [
  {
    id: 'loss',
    question: '주식 가격이 갑자기 20% 떨어졌어요. 어떻게 하실 건가요?',
    emoji: '📉',
    options: [
      { label: '당장 팔아서 손실을 막겠다', score: 0 },
      { label: '걱정되지만 일단 지켜보겠다', score: 1 },
      { label: '더 살 수 있는 기회라고 생각한다', score: 2 },
    ],
  },
  {
    id: 'horizon',
    question: '이 돈, 언제쯤 쓸 것 같나요?',
    emoji: '⏳',
    options: [
      { label: '1년 안에 쓸 수도 있다', score: 0 },
      { label: '2~3년 뒤쯤 필요할 것 같다', score: 1 },
      { label: '5년 이상 묻어둘 수 있다', score: 2 },
    ],
  },
  {
    id: 'goal',
    question: '투자로 기대하는 게 뭔가요?',
    emoji: '🎯',
    options: [
      { label: '원금만 지키면 충분하다', score: 0 },
      { label: '예금보다 좀 더 벌고 싶다', score: 1 },
      { label: '크게 불려서 목돈을 만들고 싶다', score: 2 },
    ],
  },
];

const STYLES: Record<InvestorStyle, {
  label: string; emoji: string; color: string; bg: string;
  stockRatio: number; safeRatio: number; desc: string;
  etfs: { ticker: string; name: string; desc: string; weight: number }[];
}> = {
  conservative: {
    label: '안정형', emoji: '🛡️', color: '#0284c7', bg: '#e0f2fe',
    stockRatio: 30, safeRatio: 70,
    desc: '원금 보호를 중시하며 안전한 자산을 주로 보유해요.',
    etfs: [
      { ticker: 'BND',  name: '미국 채권 ETF',    desc: '미국 전체 채권 시장 분산',   weight: 50 },
      { ticker: 'TLT',  name: '미국 장기 국채 ETF', desc: '안전한 미국 정부 장기 채권', weight: 20 },
      { ticker: 'VOO',  name: 'S&P 500 ETF',       desc: '미국 대형주 500개 분산',    weight: 30 },
    ],
  },
  balanced: {
    label: '균형형', emoji: '⚖️', color: '#7c3aed', bg: '#ede9fe',
    stockRatio: 60, safeRatio: 40,
    desc: '수익과 안정성의 균형을 맞춘 포트폴리오예요.',
    etfs: [
      { ticker: 'VOO',  name: 'S&P 500 ETF',  desc: '미국 대형주 500개 분산',  weight: 40 },
      { ticker: 'QQQ',  name: '나스닥 100 ETF', desc: '미국 기술·성장주 100개', weight: 20 },
      { ticker: 'BND',  name: '미국 채권 ETF',  desc: '안전 자산 완충 역할',    weight: 40 },
    ],
  },
  aggressive: {
    label: '성장형', emoji: '🚀', color: '#059669', bg: '#d1fae5',
    stockRatio: 80, safeRatio: 20,
    desc: '장기적으로 크게 성장하는 것을 목표로 해요.',
    etfs: [
      { ticker: 'QQQ',  name: '나스닥 100 ETF', desc: '미국 기술·성장주 100개', weight: 40 },
      { ticker: 'VOO',  name: 'S&P 500 ETF',  desc: '미국 대형주 500개 분산',  weight: 40 },
      { ticker: 'BND',  name: '미국 채권 ETF',  desc: '리스크 완충용 안전 자산', weight: 20 },
    ],
  },
};

function scoreToStyle(total: number): InvestorStyle {
  if (total <= 2) return 'conservative';
  if (total <= 4) return 'balanced';
  return 'aggressive';
}

function fmtKRW(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e8) return `${(n / 1e8).toFixed(1)}억원`;
  if (abs >= 1e4) return `${Math.round(n / 1e4).toLocaleString()}만원`;
  return `${n.toLocaleString()}원`;
}

const QUICK_AMOUNTS = [
  { label: '50만', value: 500_000 },
  { label: '100만', value: 1_000_000 },
  { label: '300만', value: 3_000_000 },
  { label: '500만', value: 5_000_000 },
  { label: '1000만', value: 10_000_000 },
];

type Step = 'intro' | 0 | 1 | 2 | 'amount' | 'result';

export default function BeginnerGuide({ onClose, onStart, accentHex = '#7c3aed', accentLight = '#ede9fe', usdKrw = 1400 }: Props) {
  const [step, setStep] = useState<Step>('intro');
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [pricesLoading, setPricesLoading] = useState(false);

  const totalScore = answers.reduce((s, a) => s + a, 0);
  const style = scoreToStyle(totalScore);
  const styleMeta = STYLES[style];
  const currentQ = typeof step === 'number' ? QUESTIONS[step] : null;

  const investAmount = Number(amountInput.replace(/,/g, '')) || 0;

  const progress: number =
    step === 'intro' ? 0
    : step === 'result' ? 100
    : step === 'amount' ? 85
    : (((step as number) + 1) / 3) * 70;

  // fetch ETF prices when entering result step
  useEffect(() => {
    if (step !== 'result') return;
    const etfs = STYLES[style].etfs;
    setPricesLoading(true);
    const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') ?? '') : '';
    Promise.all(
      etfs.map((e) =>
        fetch(`${api}/securities/${encodeURIComponent(e.ticker)}/quote`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((r) => r.ok ? r.json() : null)
          .then((d) => [e.ticker, d?.price ?? null] as const)
          .catch(() => [e.ticker, null] as const)
      )
    ).then((results) => {
      const map: Record<string, number | null> = {};
      for (const [ticker, price] of results) map[ticker] = price;
      setPrices(map);
    }).finally(() => setPricesLoading(false));
  }, [step, style]);

  function buildSuggestions(): BeginnerSuggestion[] {
    return STYLES[style].etfs.map((e) => {
      const amountKRW = Math.round((e.weight / 100) * investAmount);
      const priceUSD = prices[e.ticker] ?? null;
      const suggestedShares = priceUSD && priceUSD > 0
        ? Math.floor(amountKRW / (priceUSD * usdKrw))
        : null;
      return { ticker: e.ticker, name: e.name, desc: e.desc, weight: e.weight, amountKRW, priceUSD, suggestedShares };
    });
  }

  function handleNext() {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    const nextIdx = (step as number) + 1;
    if (nextIdx < QUESTIONS.length) setStep(nextIdx as 0 | 1 | 2);
    else setStep('amount');
  }

  function handleAmountNext() {
    if (investAmount <= 0) return;
    setStep('result');
  }

  function handleBack() {
    if (step === 'result') { setStep('amount'); }
    else if (step === 'amount') { setStep(2); setAnswers(answers.slice(0, 2)); setSelected(null); }
    else if (typeof step === 'number' && step > 0) { setStep((step - 1) as 0 | 1 | 2); setAnswers(answers.slice(0, step - 1)); setSelected(null); }
  }

  function handleStart() {
    onStart({
      style,
      stockRatio: styleMeta.stockRatio,
      safeRatio: styleMeta.safeRatio,
      investAmount,
      suggestions: buildSuggestions(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col" style={{ background: '#ffffff', maxHeight: '90vh' }}>
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌱</span>
            <span className="font-bold text-sm" style={{ color: '#1c1c1e' }}>투자 성향 테스트</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#f1f5f9', color: '#64748b' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* 프로그레스 */}
        {step !== 'intro' && (
          <div className="px-6 pb-3 shrink-0">
            <div className="h-1.5 rounded-full" style={{ background: '#f1f5f9' }}>
              <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: accentHex }} />
            </div>
          </div>
        )}

        {/* 컨텐츠 (스크롤 가능) */}
        <div className="px-6 pb-6 overflow-y-auto flex-1">

          {/* ── 인트로 ── */}
          {step === 'intro' && (
            <div className="text-center pt-4">
              <div className="text-5xl mb-4">📊</div>
              <h2 className="font-black text-xl mb-2" style={{ color: '#1c1c1e' }}>주식이 처음이신가요?</h2>
              <p className="text-sm leading-relaxed mb-5" style={{ color: '#64748b' }}>
                3가지 질문으로 투자 성향을 파악하고,<br/>
                투자 금액에 맞는 ETF 포트폴리오를 추천해 드려요.
              </p>
              <div className="rounded-2xl p-4 mb-5 text-left" style={{ background: '#f8fafc', border: '1px solid #e8ecf4' }}>
                <div className="space-y-2">
                  {[
                    { step: '01', text: '투자 성향 3가지 질문' },
                    { step: '02', text: '투자 가능 금액 입력' },
                    { step: '03', text: '맞춤 ETF 포트폴리오 + 실시간 단가 확인' },
                  ].map((s) => (
                    <div key={s.step} className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: accentLight, color: accentHex }}>{s.step}</span>
                      <span className="text-xs font-medium" style={{ color: '#475569' }}>{s.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl px-3 py-2 mb-5 text-[11px]" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                ⚠️ 이 결과는 참고용이며, 투자 결과를 보장하지 않아요.
              </div>
              <button onClick={() => setStep(0)} className="w-full rounded-2xl py-3.5 text-sm font-bold text-white" style={{ background: accentHex }}>
                테스트 시작하기 →
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
                  <button key={i} onClick={() => setSelected(opt.score)}
                    className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium text-left transition-all"
                    style={{ border: selected === opt.score ? `2px solid ${accentHex}` : '1.5px solid #e8ecf4', background: selected === opt.score ? accentLight : '#f8fafc', color: selected === opt.score ? accentHex : '#1c1c1e' }}>
                    <span className="inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold mr-2.5"
                      style={{ background: selected === opt.score ? accentHex : '#e8ecf4', color: selected === opt.score ? 'white' : '#94a3b8' }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {(step as number) > 0 && (
                  <button onClick={handleBack} className="flex-1 rounded-2xl py-3 text-sm font-bold" style={{ background: '#f1f5f9', color: '#64748b' }}>← 이전</button>
                )}
                <button onClick={handleNext} disabled={selected === null}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white disabled:opacity-40"
                  style={{ background: accentHex }}>
                  {(step as number) === QUESTIONS.length - 1 ? '다음 →' : '다음 →'}
                </button>
              </div>
            </div>
          )}

          {/* ── 금액 입력 ── */}
          {step === 'amount' && (
            <div className="pt-2">
              <div className="text-3xl mb-3 text-center">💰</div>
              <h2 className="font-bold text-base text-center mb-2 leading-snug" style={{ color: '#1c1c1e' }}>얼마를 투자하실 건가요?</h2>
              <p className="text-xs text-center mb-5" style={{ color: '#94a3b8' }}>현재 투자 가능한 금액을 입력해 주세요</p>

              {/* 빠른 선택 */}
              <div className="flex flex-wrap gap-2 mb-4">
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

              {/* 직접 입력 */}
              <div className="relative mb-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, '');
                    setAmountInput(raw ? Number(raw).toLocaleString() : '');
                  }}
                  placeholder="직접 입력 (원)"
                  className="w-full rounded-2xl px-4 py-3.5 text-base font-bold text-right outline-none pr-12"
                  style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4', color: '#1c1c1e' }}
                  onFocus={(e) => (e.target.style.borderColor = accentHex)}
                  onBlur={(e) => (e.target.style.borderColor = '#e8ecf4')}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: '#94a3b8' }}>원</span>
              </div>
              {investAmount > 0 && (
                <div className="text-center text-xs mb-4 font-semibold" style={{ color: accentHex }}>{fmtKRW(investAmount)}</div>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={handleBack} className="flex-1 rounded-2xl py-3 text-sm font-bold" style={{ background: '#f1f5f9', color: '#64748b' }}>← 이전</button>
                <button onClick={handleAmountNext} disabled={investAmount <= 0}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white disabled:opacity-40"
                  style={{ background: accentHex }}>
                  결과 보기 →
                </button>
              </div>
            </div>
          )}

          {/* ── 결과 ── */}
          {step === 'result' && (
            <div className="pt-2">
              {/* 성향 배지 */}
              <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: styleMeta.bg, border: `1.5px solid ${styleMeta.color}30` }}>
                <span className="text-3xl">{styleMeta.emoji}</span>
                <div>
                  <div className="font-black text-base" style={{ color: styleMeta.color }}>{styleMeta.label}</div>
                  <div className="text-xs leading-relaxed mt-0.5" style={{ color: '#475569' }}>{styleMeta.desc}</div>
                </div>
              </div>

              {/* 비율 요약 */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1 rounded-xl p-3 text-center" style={{ background: '#fef3c7' }}>
                  <div className="text-xl font-black" style={{ color: '#d97706' }}>{styleMeta.stockRatio}%</div>
                  <div className="text-[10px] font-semibold" style={{ color: '#92400e' }}>주식</div>
                </div>
                <div className="flex-1 rounded-xl p-3 text-center" style={{ background: '#dbeafe' }}>
                  <div className="text-xl font-black" style={{ color: '#1d4ed8' }}>{styleMeta.safeRatio}%</div>
                  <div className="text-[10px] font-semibold" style={{ color: '#1e40af' }}>안전자산</div>
                </div>
                <div className="flex-1 rounded-xl p-3 text-center" style={{ background: '#f0fdf4' }}>
                  <div className="text-xl font-black" style={{ color: '#059669' }}>{fmtKRW(investAmount)}</div>
                  <div className="text-[10px] font-semibold" style={{ color: '#065f46' }}>투자 금액</div>
                </div>
              </div>

              {/* ETF 추천 테이블 */}
              <div className="rounded-2xl p-4 mb-4" style={{ background: '#f8fafc', border: '1px solid #e8ecf4' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>추천 ETF 포트폴리오</div>
                  {pricesLoading && <span className="text-[10px]" style={{ color: '#94a3b8' }}>가격 조회 중...</span>}
                </div>
                <div className="space-y-3">
                  {STYLES[style].etfs.map((etf) => {
                    const priceUSD = prices[etf.ticker];
                    const amtKRW = Math.round((etf.weight / 100) * investAmount);
                    const shares = priceUSD && priceUSD > 0 ? Math.floor(amtKRW / (priceUSD * usdKrw)) : null;
                    const residualKRW = shares != null && priceUSD ? amtKRW - shares * priceUSD * usdKrw : null;
                    return (
                      <div key={etf.ticker} className="rounded-xl p-3" style={{ background: '#ffffff', border: '1px solid #e8ecf4' }}>
                        <div className="flex items-start justify-between mb-1.5">
                          <div>
                            <span className="font-black text-sm" style={{ color: '#1c1c1e' }}>{etf.ticker}</span>
                            <span className="ml-2 text-xs font-medium" style={{ color: '#475569' }}>{etf.name}</span>
                          </div>
                          <span className="text-xs font-bold rounded-full px-2 py-0.5" style={{ background: accentLight, color: accentHex }}>{etf.weight}%</span>
                        </div>
                        <div className="text-[11px] mb-2" style={{ color: '#94a3b8' }}>{etf.desc}</div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg p-2" style={{ background: '#f8fafc' }}>
                            <div className="text-[10px] mb-0.5" style={{ color: '#94a3b8' }}>목표 금액</div>
                            <div className="text-xs font-bold" style={{ color: '#1c1c1e' }}>{fmtKRW(amtKRW)}</div>
                          </div>
                          <div className="rounded-lg p-2" style={{ background: '#f8fafc' }}>
                            <div className="text-[10px] mb-0.5" style={{ color: '#94a3b8' }}>현재 단가</div>
                            <div className="text-xs font-bold" style={{ color: '#1c1c1e' }}>
                              {pricesLoading ? '...' : priceUSD != null ? `$${priceUSD.toFixed(0)}` : '—'}
                            </div>
                          </div>
                          <div className="rounded-lg p-2" style={{ background: '#f8fafc' }}>
                            <div className="text-[10px] mb-0.5" style={{ color: '#94a3b8' }}>매수 수량</div>
                            <div className="text-xs font-bold" style={{ color: styleMeta.color }}>
                              {shares != null ? `${shares}주` : '—'}
                            </div>
                          </div>
                        </div>
                        {shares != null && residualKRW != null && residualKRW > 0 && (
                          <div className="text-[10px] mt-1.5 text-right" style={{ color: '#94a3b8' }}>
                            잔여 {fmtKRW(Math.round(residualKRW))} (1주 미만)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] mt-3 leading-relaxed" style={{ color: '#94a3b8' }}>
                  * 1달러 = {usdKrw.toLocaleString()}원 기준 · 실제 체결 단가와 다를 수 있어요
                </p>
              </div>

              <div className="rounded-xl px-3 py-2.5 text-[11px] mb-4" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                ⚠️ 투자 권유가 아닌 참고 자료입니다. 투자 결과는 본인 책임입니다.
              </div>

              <div className="flex gap-2">
                <button onClick={handleBack} className="rounded-2xl px-4 py-3 text-sm font-bold" style={{ background: '#f1f5f9', color: '#64748b' }}>← 다시</button>
                <button onClick={handleStart} className="flex-1 rounded-2xl py-3 text-sm font-bold text-white" style={{ background: styleMeta.color }}>
                  이 포트폴리오로 시작하기 →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

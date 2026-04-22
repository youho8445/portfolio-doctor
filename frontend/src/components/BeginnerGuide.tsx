'use client';

import { useState } from 'react';

export type InvestorStyle = 'conservative' | 'balanced' | 'aggressive';

export interface BeginnerResult {
  style: InvestorStyle;
  stockRatio: number;
  safeRatio: number;
}

interface Props {
  onClose: () => void;
  onStart: (result: BeginnerResult) => void;
  accentHex?: string;
  accentLight?: string;
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
  label: string;
  emoji: string;
  color: string;
  bg: string;
  stockRatio: number;
  safeRatio: number;
  desc: string;
  tip: string;
}> = {
  conservative: {
    label: '안정형',
    emoji: '🛡️',
    color: '#0284c7',
    bg: '#e0f2fe',
    stockRatio: 30,
    safeRatio: 70,
    desc: '원금 보호를 가장 중요하게 여기는 투자자예요. 수익보다는 안전하게 자산을 지키는 방식이 잘 맞아요.',
    tip: '채권·예금 같은 안전 자산을 많이 두고, 주식 비중을 낮게 유지하면 변동성이 줄어요.',
  },
  balanced: {
    label: '균형형',
    emoji: '⚖️',
    color: '#7c3aed',
    bg: '#ede9fe',
    stockRatio: 60,
    safeRatio: 40,
    desc: '적당한 수익을 원하면서 너무 큰 손실은 피하고 싶은 투자자예요. 주식과 안전 자산을 섞는 방식이 잘 맞아요.',
    tip: '주식과 안전 자산을 6:4로 섞으면 시장이 흔들려도 충격을 줄일 수 있어요.',
  },
  aggressive: {
    label: '성장형',
    emoji: '🚀',
    color: '#059669',
    bg: '#d1fae5',
    stockRatio: 80,
    safeRatio: 20,
    desc: '장기적으로 크게 불리는 것을 목표로 하는 투자자예요. 단기 손실이 생겨도 버틸 수 있어요.',
    tip: '주식 비중을 높게 유지하되 여러 분야에 나눠 담으면 리스크를 관리할 수 있어요.',
  },
};

function scoreToStyle(total: number): InvestorStyle {
  if (total <= 2) return 'conservative';
  if (total <= 4) return 'balanced';
  return 'aggressive';
}

export default function BeginnerGuide({ onClose, onStart, accentHex = '#7c3aed', accentLight = '#ede9fe' }: Props) {
  const [step, setStep] = useState<'intro' | 0 | 1 | 2 | 'result'>('intro');
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const currentQ = typeof step === 'number' ? QUESTIONS[step] : null;
  const totalScore = answers.reduce((s, a) => s + a, 0);
  const resultStyle = step === 'result' ? STYLES[scoreToStyle(totalScore)] : null;

  function handleNext() {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    const nextStep = (step as number) + 1;
    if (nextStep < QUESTIONS.length) setStep(nextStep as 0 | 1 | 2);
    else setStep('result');
  }

  function handleStart() {
    const style = scoreToStyle(totalScore);
    onStart({ style, stockRatio: STYLES[style].stockRatio, safeRatio: STYLES[style].safeRatio });
  }

  function handleBack() {
    if (step === 'result') {
      setStep(2);
      setAnswers(answers.slice(0, 2));
      setSelected(null);
    } else if (typeof step === 'number' && step > 0) {
      setStep((step - 1) as 0 | 1 | 2);
      setAnswers(answers.slice(0, step - 1));
      setSelected(null);
    } else if (step === 1) {
      setStep(0);
      setAnswers([]);
      setSelected(null);
    }
  }

  const progress = step === 'intro' ? 0 : step === 'result' ? 100 : (((step as number) + 1) / 3) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: '#ffffff' }}
      >
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌱</span>
            <span className="font-bold text-sm" style={{ color: '#1c1c1e' }}>투자 성향 테스트</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: '#f1f5f9', color: '#64748b' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* 프로그레스 바 */}
        {step !== 'intro' && (
          <div className="px-6 pb-2">
            <div className="h-1.5 rounded-full" style={{ background: '#f1f5f9' }}>
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: accentHex }}
              />
            </div>
            {step !== 'result' && (
              <div className="text-[11px] mt-1.5 text-right font-medium" style={{ color: '#94a3b8' }}>
                {(step as number) + 1} / {QUESTIONS.length}
              </div>
            )}
          </div>
        )}

        <div className="px-6 pb-6">

          {/* ── 인트로 ── */}
          {step === 'intro' && (
            <div className="text-center pt-4">
              <div className="text-5xl mb-4">📊</div>
              <h2 className="font-black text-xl mb-2" style={{ color: '#1c1c1e' }}>주식이 처음이신가요?</h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#64748b' }}>
                3가지 질문에 답하면 나에게 맞는 투자 방식과<br/>
                적정 자산 구성 비율을 알려드려요.
              </p>
              <div
                className="rounded-2xl p-4 mb-6 text-left"
                style={{ background: '#f8fafc', border: '1px solid #e8ecf4' }}
              >
                <p className="text-xs font-semibold mb-1" style={{ color: '#94a3b8' }}>이런 분께 추천해요</p>
                <ul className="space-y-1">
                  {['처음 주식 투자를 시작하는 분', '어떤 비율로 투자해야 할지 모르는 분', '자신의 투자 성향이 궁금한 분'].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-xs" style={{ color: '#475569' }}>
                      <span className="text-green-500">✓</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setStep(0)}
                className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: accentHex }}
              >
                테스트 시작하기 →
              </button>
            </div>
          )}

          {/* ── 질문 ── */}
          {currentQ && (
            <div className="pt-2">
              <div className="text-3xl mb-3 text-center">{currentQ.emoji}</div>
              <h2 className="font-bold text-base text-center mb-5 leading-snug" style={{ color: '#1c1c1e' }}>
                {currentQ.question}
              </h2>
              <div className="space-y-2.5 mb-6">
                {currentQ.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(opt.score)}
                    className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium text-left transition-all"
                    style={{
                      border: selected === opt.score ? `2px solid ${accentHex}` : '1.5px solid #e8ecf4',
                      background: selected === opt.score ? accentLight : '#f8fafc',
                      color: selected === opt.score ? accentHex : '#1c1c1e',
                    }}
                  >
                    <span
                      className="inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold mr-2.5"
                      style={{
                        background: selected === opt.score ? accentHex : '#e8ecf4',
                        color: selected === opt.score ? 'white' : '#94a3b8',
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {(step as number) > 0 && (
                  <button
                    onClick={handleBack}
                    className="flex-1 rounded-2xl py-3 text-sm font-bold transition-all"
                    style={{ background: '#f1f5f9', color: '#64748b' }}
                  >
                    ← 이전
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={selected === null}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40"
                  style={{ background: accentHex }}
                >
                  {(step as number) === QUESTIONS.length - 1 ? '결과 보기' : '다음 →'}
                </button>
              </div>
            </div>
          )}

          {/* ── 결과 ── */}
          {step === 'result' && resultStyle && (
            <div className="pt-2">
              <div
                className="rounded-2xl p-5 mb-4 text-center"
                style={{ background: resultStyle.bg, border: `1.5px solid ${resultStyle.color}30` }}
              >
                <div className="text-4xl mb-2">{resultStyle.emoji}</div>
                <div className="font-black text-xl mb-1" style={{ color: resultStyle.color }}>
                  {resultStyle.label}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>
                  {resultStyle.desc}
                </p>
              </div>

              {/* 추천 비율 */}
              <div className="rounded-2xl p-4 mb-4" style={{ background: '#f8fafc', border: '1px solid #e8ecf4' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>추천 자산 구성</p>
                <div className="flex gap-2 mb-3">
                  <div
                    className="flex-none rounded-xl px-3 py-2 text-center"
                    style={{ background: '#fef3c7', flex: resultStyle.stockRatio }}
                  >
                    <div className="text-lg font-black" style={{ color: '#d97706' }}>{resultStyle.stockRatio}%</div>
                    <div className="text-[10px] font-semibold" style={{ color: '#92400e' }}>주식</div>
                  </div>
                  <div
                    className="flex-none rounded-xl px-3 py-2 text-center"
                    style={{ background: '#dbeafe', flex: resultStyle.safeRatio }}
                  >
                    <div className="text-lg font-black" style={{ color: '#1d4ed8' }}>{resultStyle.safeRatio}%</div>
                    <div className="text-[10px] font-semibold" style={{ color: '#1e40af' }}>안전자산</div>
                  </div>
                </div>
                {/* 비율 바 */}
                <div className="h-2 rounded-full overflow-hidden flex" style={{ background: '#e2e8f0' }}>
                  <div className="h-full" style={{ width: `${resultStyle.stockRatio}%`, background: '#f59e0b' }} />
                  <div className="h-full" style={{ width: `${resultStyle.safeRatio}%`, background: '#3b82f6' }} />
                </div>
                <p className="text-[11px] mt-3 leading-relaxed" style={{ color: '#64748b' }}>
                  💡 {resultStyle.tip}
                </p>
              </div>

              <div
                className="rounded-xl px-3 py-2.5 text-[11px] mb-4 leading-relaxed"
                style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}
              >
                ⚠️ 이 결과는 투자 권유가 아니에요. 개인 성향을 참고하는 용도로만 활용해주세요.
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleBack}
                  className="rounded-2xl px-4 py-3 text-sm font-bold transition-all"
                  style={{ background: '#f1f5f9', color: '#64748b' }}
                >
                  ← 다시
                </button>
                <button
                  onClick={handleStart}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: resultStyle.color }}
                >
                  이 구성으로 시작하기 →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

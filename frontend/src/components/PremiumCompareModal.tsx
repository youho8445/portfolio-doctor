'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/api';
import type { PortfolioSummary } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCta: () => void;
  portfolioSummary?: PortfolioSummary;
}

const KO_SECTOR: Record<string, string> = {
  'Information Technology': 'IT',
  'Technology': 'IT',
  'Healthcare': '헬스케어',
  'Health Care': '헬스케어',
  'Financials': '금융',
  'Financial Services': '금융',
  'Consumer Discretionary': '소비재',
  'Consumer Staples': '필수소비재',
  'Industrials': '산업재',
  'Energy': '에너지',
  'Materials': '소재',
  'Real Estate': '부동산',
  'Utilities': '유틸리티',
  'Communication Services': '통신',
  'Telecommunication Services': '통신',
};

const HOLDING_WARN = 40;
const SECTOR_WARN = 50;
const HOLDING_SHOW = 20;
const SECTOR_SHOW = 30;

export default function PremiumCompareModal({ isOpen, onClose, onCta, portfolioSummary }: Props) {
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCta = () => {
    void trackEvent('premium_cta_click', user?.id);
    onClose();
    onCta();
  };

  const { topHolding, topSector, healthScore } = portfolioSummary ?? {};
  const sectorLabel = topSector ? (KO_SECTOR[topSector.sector] || topSector.sector) : null;

  const bars: { label: string; pct: number; color: string; warn: boolean }[] = [];
  if (topHolding && topHolding.weight >= HOLDING_SHOW) {
    bars.push({ label: topHolding.name, pct: Math.round(topHolding.weight), color: '#3b82f6', warn: topHolding.weight >= HOLDING_WARN });
  }
  if (topSector && topSector.weight >= SECTOR_SHOW && sectorLabel) {
    bars.push({ label: `${sectorLabel} 섹터`, pct: Math.round(topSector.weight), color: '#6366f1', warn: topSector.weight >= SECTOR_WARN });
  }

  const hasRisk = bars.some(b => b.warn);

  const questions: string[] = [];
  if (topHolding && topHolding.weight >= HOLDING_WARN) {
    questions.push(`${topHolding.name}의 비중이 집중도에 얼마나 영향을 주나요?`);
  } else {
    questions.push('어떤 종목이 집중도를 높이고 있나요?');
  }
  if (sectorLabel) {
    questions.push(`${sectorLabel} 섹터가 실제 리스크 원인인가요?`);
  } else {
    questions.push('어느 섹터가 실제 리스크 원인인가요?');
  }
  questions.push('조금만 바꾸면 어떻게 달라지나요?');

  const warnMessage = hasRisk
    ? (topSector && topSector.weight >= SECTOR_WARN && sectorLabel)
      ? `${sectorLabel} 변동성 발생 시 전체 포트폴리오가 크게 흔들릴 수 있습니다.`
      : (topHolding && topHolding.weight >= HOLDING_WARN)
        ? `${topHolding.name} 주가 변동이 포트폴리오 전체에 큰 영향을 줍니다.`
        : null
    : null;

  const subtitleText = hasRisk
    ? '집중도 위험이 감지됐지만 자세한 내용은 확인이 필요합니다.'
    : portfolioSummary
      ? '현재 큰 위험 신호는 적지만, 변화가 생기면 자세한 원인과 조정 방향을 확인할 수 있습니다.'
      : '집중도 경고가 발생했지만 자세한 내용은 확인이 필요합니다.';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, centered dialog on md+ */}
      <div
        className={[
          'relative z-10 w-full bg-[#111318] text-white',
          'md:max-w-md md:rounded-2xl md:mx-4',
          'rounded-t-2xl md:rounded-2xl',
          'max-h-[92dvh] overflow-y-auto',
          'flex flex-col',
        ].join(' ')}
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors z-10"
          aria-label="닫기"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="px-6 pt-7 pb-8 flex flex-col gap-6">

          {/* ── 1. Header ── */}
          <div className="pr-6">
            <h2 className="text-xl font-semibold leading-snug text-white">
              포트폴리오 리스크,<br />지금 얼마나 보이고 있나요?
            </h2>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              {subtitleText}
            </p>
          </div>

          {/* ── 2. Portfolio Preview ── */}
          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400">포트폴리오 현황</span>
              {healthScore !== undefined && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: healthScore >= 80 ? 'rgba(16,185,129,0.15)' : healthScore >= 60 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                    color: healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444',
                  }}
                >
                  건강 점수 {healthScore}
                </span>
              )}
            </div>
            {bars.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {bars.map((b) => (
                  <div key={b.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${b.warn ? 'text-amber-400' : 'text-gray-300'}`}>{b.label}</span>
                      <span className={`text-xs font-semibold ${b.warn ? 'text-amber-400' : 'text-gray-400'}`}>{b.pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-800">
                      <div className="h-1.5 rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 leading-relaxed">
                현재 큰 위험 신호는 적지만, 변화가 생기면 자세한 원인과 조정 방향을 확인할 수 있습니다.
              </p>
            )}
            {warnMessage && (
              <div className="mt-4 flex items-start gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p className="text-xs text-amber-400 leading-relaxed">{warnMessage}</p>
              </div>
            )}
          </div>

          {/* ── 3. Insight Gap ── */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-3">
              지금 확인할 수 없는 것들
            </p>
            <div className="flex flex-col gap-2">
              {questions.map((q) => (
                <div key={q} className="flex items-start gap-3 border-l-2 border-gray-800 pl-3">
                  <p className="text-sm text-gray-400 leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── 4. Divider ── */}
          <hr style={{ borderColor: 'rgba(255,255,255,0.07)' }} />

          {/* ── 5. Clarity Section ── */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">
                지금 볼 수 있는 것
              </p>
              <p className="text-sm text-gray-400 leading-relaxed">
                {hasRisk ? '포트폴리오에 위험 신호가 있다는 사실.' : '포트폴리오 건강 점수와 기본 분산 현황.'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
                더 깊이 보면
              </p>
              <p className="text-sm text-gray-200 leading-relaxed">
                왜 위험한지, 어떤 자산이 영향을 주는지,<br />
                그리고 어떻게 안정화할 수 있는지.
              </p>
            </div>
          </div>

          {/* ── 6. CTA ── */}
          <div className="flex flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
            <button
              onClick={handleCta}
              className="w-full rounded-xl py-3.5 font-medium text-gray-900 bg-white hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm"
            >
              내 포트폴리오 자세히 보기
            </button>
            <button
              onClick={onClose}
              className="w-full text-sm text-gray-600 hover:text-gray-400 transition-colors underline underline-offset-2"
            >
              나중에 확인할게요
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

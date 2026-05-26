'use client';

import { useEffect, useRef, useState } from 'react';
import { BaselineDrift, RebalanceAction } from '@/types';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

interface TickerQuote {
  ticker: string;
  name: string;
  price: number;
  priceChange: number;
  priceChangePct: number;
  currency: string;
  marketCap: number | null;
  pe: number | null;
  forwardPe: number | null;
  eps: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  profitMargin: number | null;
  debtToEquity: number | null;
  roe: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyDayAvg: number | null;
  twoHundredDayAvg: number | null;
  volume: number | null;
  avgVolume: number | null;
  dividendYield: number | null;
  priceToBook: number | null;
  history: { time: string; open: number; high: number; low: number; close: number; volume: number }[];
  fetchedAt: string;
}

type Period = '1M' | '3M' | '6M' | '1Y';

interface Props {
  ticker: string;
  displayName?: string;
  accentHex: string;
  accentLight: string;
  rebalanceAction?: RebalanceAction;
  drift?: BaselineDrift;
  onClose: () => void;
}

function fmt(n: number | null, decimals = 2, suffix = ''): string {
  if (n == null) return '—';
  return n.toFixed(decimals) + suffix;
}

function fmtBig(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

function fmtVol(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}

function filterHistory(
  history: TickerQuote['history'],
  period: Period,
): TickerQuote['history'] {
  const now = Date.now();
  const ms: Record<Period, number> = {
    '1M': 30 * 24 * 60 * 60 * 1000,
    '3M': 90 * 24 * 60 * 60 * 1000,
    '6M': 180 * 24 * 60 * 60 * 1000,
    '1Y': 365 * 24 * 60 * 60 * 1000,
  };
  const cutoff = now - ms[period];
  return history.filter((h) => new Date(h.time).getTime() >= cutoff);
}

function buildRebalanceReason(q: TickerQuote, action: RebalanceAction | undefined): string {
  if (!action || action.ticker === '_sector_div') return '';
  const parts: string[] = [];

  if (action.type === 'reduce') {
    parts.push(`현재 비중 ${action.from}%로 집중되어 있어 ${action.to}%로 축소를 권장합니다.`);
    if (q.pe != null && q.pe > 30) parts.push(`P/E ${q.pe.toFixed(1)}배로 고평가 구간입니다.`);
    const ytdPct = q.history.length >= 2
      ? ((q.history[q.history.length - 1].close - q.history[0].close) / q.history[0].close) * 100
      : null;
    if (ytdPct != null && ytdPct > 30) parts.push(`1년 수익률 +${ytdPct.toFixed(1)}%로 비중이 자연스럽게 높아졌습니다.`);
    if (q.debtToEquity != null && q.debtToEquity > 150) parts.push(`부채비율 ${q.debtToEquity.toFixed(0)}%로 재무 레버리지가 높습니다.`);
  } else if (action.type === 'add') {
    parts.push(`비중 ${action.from}% → ${action.to}%로 확대를 권장합니다.`);
    if (q.pe != null && q.pe < 20) parts.push(`P/E ${q.pe.toFixed(1)}배로 상대적으로 저평가되어 있습니다.`);
    if (q.revenueGrowth != null && q.revenueGrowth > 10) parts.push(`매출 성장률 +${q.revenueGrowth.toFixed(1)}%로 성장세가 견조합니다.`);
  }

  return parts.join(' ') || (action.type === 'reduce' ? '집중도 완화를 위해 비중 축소를 권장합니다.' : '분산 강화를 위해 비중 확대를 권장합니다.');
}

// SVG 라인 차트 (lightweight-charts SSR 이슈 없음)
function PriceChart({
  data,
  accentHex,
}: {
  data: { time: string; close: number }[];
  accentHex: string;
}) {
  if (data.length < 2) {
    return <div className="flex items-center justify-center h-full text-xs" style={{ color: '#9ca3af' }}>데이터 없음</div>;
  }

  const W = 600;
  const H = 160;
  const PAD = { top: 10, right: 10, bottom: 24, left: 48 };

  const prices = data.map((d) => d.close);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const xScale = (i: number) => PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right);
  const yScale = (v: number) => PAD.top + ((maxP - v) / range) * (H - PAD.top - PAD.bottom);

  const polyline = data.map((d, i) => `${xScale(i)},${yScale(d.close)}`).join(' ');
  const fill = `${polyline} ${xScale(data.length - 1)},${H - PAD.bottom} ${xScale(0)},${H - PAD.bottom}`;

  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? '#10b981' : '#ef4444';
  const fillColor = isUp ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';

  // y axis labels
  const yLabels = [minP, (minP + maxP) / 2, maxP];

  // x axis labels (first, mid, last)
  const xLabels = [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      <polygon points={fill} fill={fillColor} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      {/* y axis */}
      {yLabels.map((v, i) => (
        <text key={i} x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
          {v >= 1000 ? v.toFixed(0) : v.toFixed(2)}
        </text>
      ))}
      {/* x axis */}
      {xLabels.map((idx) => (
        <text key={idx} x={xScale(idx)} y={H - 4} textAnchor="middle" fontSize="10" fill="#9ca3af">
          {data[idx]?.time.slice(5)}
        </text>
      ))}
    </svg>
  );
}

export default function TickerModal({ ticker, displayName, accentHex, accentLight, rebalanceAction, drift, onClose }: Props) {
  const [quote, setQuote] = useState<TickerQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('3M');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('auth_token') ?? '';
    fetch(`${API}/securities/${encodeURIComponent(ticker)}/quote`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => { setQuote(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [ticker]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const chartData = quote ? filterHistory(quote.history, period) : [];
  const isUp = quote && quote.priceChangePct >= 0;
  const rebalanceReason = quote ? buildRebalanceReason(quote, rebalanceAction) : '';

  const PERIODS: Period[] = ['1M', '3M', '6M', '1Y'];

  const metrics = quote
    ? [
        { label: 'P/E (TTM)', value: fmt(quote.pe, 1, 'x') },
        { label: 'Forward P/E', value: fmt(quote.forwardPe, 1, 'x') },
        { label: 'P/B', value: fmt(quote.priceToBook, 2, 'x') },
        { label: 'EPS', value: fmt(quote.eps, 2, '') },
        { label: '매출 성장', value: fmt(quote.revenueGrowth, 1, '%') },
        { label: '순이익률', value: fmt(quote.profitMargin, 1, '%') },
        { label: 'ROE', value: fmt(quote.roe, 1, '%') },
        { label: '부채비율', value: fmt(quote.debtToEquity, 0, '%') },
        { label: '배당수익률', value: fmt(quote.dividendYield, 2, '%') },
        { label: '시가총액', value: fmtBig(quote.marketCap) },
        { label: '52주 고점', value: fmt(quote.fiftyTwoWeekHigh, 2, '') },
        { label: '52주 저점', value: fmt(quote.fiftyTwoWeekLow, 2, '') },
        { label: '50일 이평', value: fmt(quote.fiftyDayAvg, 2, '') },
        { label: '200일 이평', value: fmt(quote.twoHundredDayAvg, 2, '') },
        { label: '거래량', value: fmtVol(quote.volume) },
        { label: '평균 거래량', value: fmtVol(quote.avgVolume) },
      ]
    : [];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl flex flex-col"
        style={{ background: '#ffffff', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 px-5 pt-5 pb-4 flex items-start justify-between" style={{ background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-black text-lg" style={{ color: '#1c1c1e' }}>{displayName ?? ticker}</span>
              {rebalanceAction && rebalanceAction.ticker !== '_sector_div' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                  background: rebalanceAction.type === 'reduce' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                  color: rebalanceAction.type === 'reduce' ? '#ef4444' : '#10b981',
                }}>
                  {rebalanceAction.type === 'reduce' ? `${rebalanceAction.from}% → ${rebalanceAction.to}% 축소 권장` : `${rebalanceAction.from}% → ${rebalanceAction.to}% 확대 권장`}
                </span>
              )}
            </div>
            <div className="text-xs" style={{ color: '#6b7280' }}>{ticker}</div>
          </div>
          <div className="flex items-center gap-3">
            {quote && (
              <div className="text-right">
                <div className="font-black text-lg" style={{ color: '#1c1c1e' }}>
                  {quote.currency === 'KRW' ? '₩' : '$'}{quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs font-bold" style={{ color: isUp ? '#10b981' : '#ef4444' }}>
                  {isUp ? '+' : ''}{quote.priceChange.toFixed(2)} ({isUp ? '+' : ''}{quote.priceChangePct.toFixed(2)}%)
                </div>
              </div>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100" style={{ color: '#6b7280' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 16, height: 16 }}>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: accentHex }} />
          </div>
        ) : !quote ? (
          <div className="flex items-center justify-center h-48 text-sm" style={{ color: '#9ca3af' }}>데이터를 불러올 수 없습니다.</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* 리밸런싱 이유 */}
            {rebalanceReason && (
              <div className="rounded-2xl p-4 flex gap-3" style={{
                background: rebalanceAction?.type === 'reduce' ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
                border: `1px solid ${rebalanceAction?.type === 'reduce' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
              }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{
                  background: rebalanceAction?.type === 'reduce' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={rebalanceAction?.type === 'reduce' ? '#ef4444' : '#10b981'} strokeWidth="2" style={{ width: 14, height: 14 }}>
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold mb-1" style={{ color: rebalanceAction?.type === 'reduce' ? '#ef4444' : '#10b981' }}>리밸런싱 이유</div>
                  <div className="text-xs leading-relaxed" style={{ color: '#374151' }}>{rebalanceReason}</div>
                </div>
              </div>
            )}

            {/* baseline drift */}
            {drift && (
              <div className="rounded-2xl p-4 flex gap-3" style={{ background: accentLight, border: `1px solid ${accentHex}30` }}>
                <div className="text-xs leading-relaxed" style={{ color: '#374151' }}>
                  <span className="font-bold" style={{ color: accentHex }}>처음 대비 변화: </span>
                  {drift.status === 'added' && `포트폴리오에 새로 추가된 종목입니다.`}
                  {drift.status === 'removed' && `포트폴리오에서 제거된 종목입니다.`}
                  {(drift.status === 'increased' || drift.status === 'decreased') &&
                    `처음 비중 ${drift.baselineWeight}% → 현재 ${drift.currentWeight}% (${drift.delta > 0 ? '+' : ''}${drift.delta}%p)`}
                </div>
              </div>
            )}

            {/* 가격 차트 */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Price Chart</div>
                <div className="flex gap-1">
                  {PERIODS.map((p) => (
                    <button key={p} onClick={() => setPeriod(p)}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
                      style={{
                        background: period === p ? accentHex : 'transparent',
                        color: period === p ? '#ffffff' : '#9ca3af',
                      }}
                    >{p}</button>
                  ))}
                </div>
              </div>
              <div className="px-2 pb-3">
                <PriceChart data={chartData} accentHex={accentHex} />
              </div>
              {/* 52주 범위 바 */}
              {quote.fiftyTwoWeekHigh != null && quote.fiftyTwoWeekLow != null && (
                <div className="px-4 pb-4">
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: '#9ca3af' }}>
                    <span>52주 저점 ${quote.fiftyTwoWeekLow}</span>
                    <span>52주 고점 ${quote.fiftyTwoWeekHigh}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                    <div className="h-full rounded-full" style={{
                      background: `linear-gradient(90deg, ${accentHex}60, ${accentHex})`,
                      width: `${Math.min(100, Math.max(0, ((quote.price - quote.fiftyTwoWeekLow) / (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) * 100))}%`,
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* 재무지표 그리드 */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9ca3af' }}>재무지표</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {metrics.filter((m) => m.value !== '—').map((m) => (
                  <div key={m.label} className="rounded-xl px-3 py-2.5 text-center" style={{ background: '#f8fafc', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div className="text-[10px] mb-1" style={{ color: '#9ca3af' }}>{m.label}</div>
                    <div className="text-sm font-black tabular-nums" style={{ color: '#1c1c1e' }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 데이터 갱신 시각 */}
            <div className="text-[10px] text-right" style={{ color: '#cbd5e1' }}>
              15분 지연 데이터 · {new Date(quote.fetchedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

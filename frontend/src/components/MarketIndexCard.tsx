'use client';

import { useEffect, useState, useCallback } from 'react';
import { getMarketIndices, type MarketIndex } from '@/lib/api';

interface Props {
  /** When true: renders as a fixed bottom-sheet modal overlay (for mobile) */
  modal?: boolean;
  onClose?: () => void;
  className?: string;
}

function formatValue(symbol: string, value: number | null): string {
  if (value == null) return '—';
  if (symbol === 'USDKRW=X') return value.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + '원';
  if (symbol === '^KS11' || symbol === '^KQ11') {
    return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatChange(pct: number | null): string {
  if (pct == null) return '';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function IndexRow({ index }: { index: MarketIndex }) {
  const up = index.changePercent != null && index.changePercent > 0;
  const down = index.changePercent != null && index.changePercent < 0;
  const changeColor = up ? '#059669' : down ? '#ef4444' : '#94a3b8';

  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
      <div className="min-w-0 flex-1 mr-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold truncate" style={{ color: '#1c1c1e' }}>{index.name}</span>
          {index.stale && (
            <span className="text-[9px] font-semibold shrink-0" style={{ color: '#f59e0b' }} title="데이터 지연 가능">⚠</span>
          )}
        </div>
        <div className="text-[10px] truncate" style={{ color: '#94a3b8' }}>{index.description}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs font-bold tabular-nums" style={{ color: '#1c1c1e' }}>
          {formatValue(index.symbol, index.value)}
        </div>
        <div className="text-[10px] font-semibold tabular-nums" style={{ color: changeColor }}>
          {index.changePercent != null ? (
            <>
              {up ? '▲' : down ? '▼' : ''}
              {' '}{formatChange(index.changePercent)}
            </>
          ) : (
            <span style={{ color: '#cbd5e1' }}>—</span>
          )}
        </div>
      </div>
    </div>
  );
}

function CardContent({ indices, updatedAt, loading, stale, onRefresh }: {
  indices: MarketIndex[];
  updatedAt: string;
  loading: boolean;
  stale: boolean;
  onRefresh: () => void;
}) {
  const timeLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
            시장 한눈에 보기
          </div>
          {stale && (
            <div className="text-[9px] font-semibold mt-0.5" style={{ color: '#f59e0b' }}>
              데이터 지연 가능
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {timeLabel && !loading && (
            <span className="text-[9px]" style={{ color: '#cbd5e1' }}>{timeLabel} 기준</span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ background: '#f8fafc', color: '#94a3b8' }}
            title="새로고침"
          >
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ width: 11, height: 11, transform: loading ? 'rotate(360deg)' : undefined, transition: loading ? 'transform 0.5s linear' : undefined }}
              className={loading ? 'animate-spin' : ''}
            >
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Rows */}
      <div className="px-4">
        {loading && indices.length === 0 ? (
          // Skeleton
          <div className="space-y-0">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="flex-1 mr-4 space-y-1">
                  <div className="h-3 rounded animate-pulse" style={{ background: '#f1f5f9', width: '60%' }} />
                  <div className="h-2.5 rounded animate-pulse" style={{ background: '#f8fafc', width: '40%' }} />
                </div>
                <div className="space-y-1 text-right">
                  <div className="h-3 rounded animate-pulse" style={{ background: '#f1f5f9', width: 56 }} />
                  <div className="h-2.5 rounded animate-pulse" style={{ background: '#f8fafc', width: 40 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          indices.map((idx) => <IndexRow key={idx.symbol} index={idx} />)
        )}
      </div>
    </>
  );
}

export default function MarketIndexCard({ modal, onClose, className }: Props) {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMarketIndices();
      setIndices(data.indices);
      setUpdatedAt(data.updatedAt);
      setStale(data.indices.some((d) => d.stale));
    } catch {
      setStale(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  // Close modal on Escape
  useEffect(() => {
    if (!modal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [modal, onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!modal) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [modal]);

  if (modal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <div
          className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
          style={{ background: '#ffffff', maxHeight: '80vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="px-4 pt-4 pb-0 flex items-center justify-end">
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: '#f1f5f9', color: '#64748b' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 44px)' }}>
            <CardContent indices={indices} updatedAt={updatedAt} loading={loading} stale={stale} onRefresh={fetch} />
          </div>
        </div>
      </div>
    );
  }

  // Inline card (for desktop sidebar)
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className ?? ''}`}
      style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <CardContent indices={indices} updatedAt={updatedAt} loading={loading} stale={stale} onRefresh={fetch} />
    </div>
  );
}

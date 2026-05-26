'use client';

import { useRef, useState } from 'react';
import type { OCRParseResult, ParsedHolding, PortfolioInputItem } from '@/types';
import { getSecurities } from '@/lib/api';
import { mapNameToTicker } from '@/lib/tickerNameMap';

// ── Types ────────────────────────────────────────────────────────────────────

interface ReviewRow {
  id: string;
  stockName: string;
  ticker: string;
  market: 'KR' | 'US';
  quantity: string;
  evaluationAmountKRW: string;
  profitLossKRW: string;
  inferredAvgCostKRW: number | null;
  confidence: 'high' | 'medium' | 'low';
  userEdited: boolean;
}

interface Props {
  onClose: () => void;
  onConfirm: (items: PortfolioInputItem[]) => void;
  isLoggedIn: boolean;
  exchangeRate?: number;
  accentHex?: string;
}

type Stage = 'upload' | 'loading' | 'review' | 'error';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const DEFAULT_RATE = 1400;

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseSigned(str: string): number | null {
  const s = str.trim();
  if (!s) return null;
  const isNeg = s.startsWith('-');
  const digits = s.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const val = parseInt(digits, 10);
  return isNeg ? -val : val;
}

function parseUint(str: string): number | null {
  const digits = str.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return parseInt(digits, 10);
}

function recomputeAvgCost(row: ReviewRow): number | null {
  const evalAmt = parseUint(row.evaluationAmountKRW);
  const pl = parseSigned(row.profitLossKRW);
  const qty = parseUint(row.quantity);
  if (evalAmt == null || pl == null || qty == null || qty <= 0) return null;
  const costBasis = evalAmt - pl;
  return Math.round(costBasis / qty);
}

function fmtKRW(n: number | null): string {
  if (n == null) return '-';
  return `${n.toLocaleString('ko-KR')}원`;
}

function holdingToRow(h: ParsedHolding): ReviewRow {
  const mapped = mapNameToTicker(h.stockName);
  const ticker = mapped.ticker ?? '';
  const confidence: 'high' | 'medium' | 'low' =
    !ticker
      ? 'low'
      : mapped.confidence === 'low' || h.confidence === 'low'
        ? 'low'
        : mapped.confidence === 'medium' || h.confidence === 'medium'
          ? 'medium'
          : 'high';

  const evalStr =
    h.evaluationAmountKRW != null ? String(h.evaluationAmountKRW) : '';
  const plStr = h.profitLossKRW != null ? String(h.profitLossKRW) : '';
  const qtyStr = h.quantity != null ? String(h.quantity) : '';

  return {
    id: `${h.stockName}-${Math.random().toString(36).slice(2)}`,
    stockName: h.stockName,
    ticker,
    market: h.market ?? 'KR',
    quantity: qtyStr,
    evaluationAmountKRW: evalStr,
    profitLossKRW: plStr,
    inferredAvgCostKRW: recomputeAvgCost({
      id: '',
      stockName: h.stockName,
      ticker,
      market: h.market ?? 'KR',
      quantity: qtyStr,
      evaluationAmountKRW: evalStr,
      profitLossKRW: plStr,
      inferredAvgCostKRW: null,
      confidence,
      userEdited: false,
    }),
    confidence,
    userEdited: false,
  };
}

// ── Confidence badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const cfg = {
    high:   { label: '높음', bg: '#d1fae5', color: '#065f46' },
    medium: { label: '중간', bg: '#fef3c7', color: '#92400e' },
    low:    { label: '낮음', bg: '#fee2e2', color: '#991b1b' },
  }[level];
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ScreenshotImportModal({
  onClose,
  onConfirm,
  isLoggedIn,
  exchangeRate = DEFAULT_RATE,
  accentHex = '#6366f1',
}: Props) {
  const [stage, setStage] = useState<Stage>('upload');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File upload & OCR ────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('이미지 파일만 업로드할 수 있어요 (JPEG 또는 PNG)');
      setStage('error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('파일 크기가 10MB를 초과합니다');
      setStage('error');
      return;
    }
    setStage('loading');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', 'toss');

    try {
      const res = await fetch(`${API_BASE}/ocr/portfolio-screenshot`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: '서버 오류' }));
        throw new Error(err.message ?? `OCR 실패 (${res.status})`);
      }
      const data: OCRParseResult = await res.json();

      if (!data.holdings || data.holdings.length === 0) {
        setErrorMsg('포트폴리오 항목을 찾지 못했어요. 토스증권 보유 종목 화면을 캡처해서 올려주세요.');
        setStage('error');
        return;
      }

      const parsedRows = data.holdings.map(holdingToRow);
      setRows(parsedRows);
      setWarnings(data.rawWarnings ?? []);
      setStage('review');
    } catch (e) {
      setErrorMsg(
        e instanceof Error ? e.message : '인식에 실패했어요. 다시 시도해주세요.',
      );
      setStage('error');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  // ── Row editing ──────────────────────────────────────────────────────────

  const updateRow = (id: string, patch: Partial<ReviewRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...patch, userEdited: true };
        updated.inferredAvgCostKRW = recomputeAvgCost(updated);
        return updated;
      }),
    );
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // ── Confirm → build PortfolioInputItems ─────────────────────────────────

  const handleConfirm = async () => {
    const valid = rows.filter((r) => r.ticker.trim() !== '');
    if (valid.length === 0) {
      setErrorMsg('분석 가능한 종목이 없어요. 티커를 입력해주세요.');
      return;
    }

    setConfirming(true);
    setErrorMsg(null);

    const totalKRW = valid.reduce((s, r) => {
      const amt = parseUint(r.evaluationAmountKRW) ?? 0;
      return s + amt;
    }, 0);

    const items: PortfolioInputItem[] = [];

    for (const row of valid) {
      const ticker = row.ticker.trim().toUpperCase();
      const evalAmt = parseUint(row.evaluationAmountKRW) ?? 0;
      const weight =
        totalKRW > 0 ? Math.round((evalAmt / totalKRW) * 1000) / 10 : 0;

      const isUS = !ticker.endsWith('.KS') && !ticker.endsWith('.KQ');
      const avgCostKRW = row.inferredAvgCostKRW ?? 0;
      const avgCost = avgCostKRW > 0
        ? isUS
          ? Math.round((avgCostKRW / exchangeRate) * 100) / 100
          : avgCostKRW
        : 0;

      let securityId = 0;
      let name = row.stockName;
      let displayNameKo: string | null = row.stockName;

      if (isLoggedIn) {
        try {
          const results = await getSecurities(ticker);
          const sec = results.find(
            (s: { ticker: string; id: number; name: string; displayNameKo: string | null }) =>
              s.ticker.toUpperCase() === ticker,
          );
          if (sec) {
            securityId = sec.id;
            name = sec.name;
            displayNameKo = sec.displayNameKo;
          }
        } catch {
          // keep securityId = 0
        }
      }

      items.push({
        securityId,
        ticker,
        name,
        displayNameKo,
        weight,
        amount: 0,
        avgCost,
      });
    }

    setConfirming(false);

    if (items.length === 0) {
      setErrorMsg('종목 정보를 찾지 못했어요. 티커가 올바른지 확인해주세요.');
      return;
    }

    onConfirm(items);
  };

  const hasLowConfidence = rows.some((r) => r.confidence === 'low');
  const hasMissingTicker = rows.some((r) => r.ticker.trim() === '');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl flex flex-col"
        style={{
          background: '#ffffff',
          maxHeight: '92vh',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0"
          style={{ borderBottom: '1px solid #f1f5f9' }}
        >
          <div>
            <div className="text-base font-black" style={{ color: '#1c1c1e' }}>
              증권앱 캡처로 불러오기
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
              토스증권 보유 종목 화면 지원
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: '#f1f5f9', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* ── Upload stage ── */}
          {stage === 'upload' && (
            <div className="space-y-4">
              {/* Privacy notice */}
              <div
                className="rounded-2xl px-4 py-3 space-y-1"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
              >
                <div className="text-xs font-bold" style={{ color: '#64748b' }}>
                  개인정보 안내
                </div>
                <div className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                  스크린샷은 포트폴리오 항목 추출에만 사용됩니다. 이미지는 저장되지 않습니다.
                </div>
                <div className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                  이미지 인식을 위해 Anthropic API에 일시적으로 전송됩니다.
                </div>
              </div>

              {/* Upload area */}
              <div
                className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-12 px-6 gap-4 cursor-pointer transition-all"
                style={{ borderColor: '#cbd5e1', background: '#f8fafc' }}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.borderColor = accentHex)
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.borderColor = '#cbd5e1')
                }
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: `${accentHex}18` }}
                >
                  📷
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold" style={{ color: '#1c1c1e' }}>
                    스크린샷을 올려주세요
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                    클릭하거나 파일을 끌어다 놓으세요
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                    JPEG · PNG · 최대 10MB
                  </div>
                </div>
                <div
                  className="text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: `${accentHex}18`, color: accentHex }}
                >
                  토스증권 지원
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleInputChange}
              />

              {/* How to screenshot guide */}
              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
              >
                <div className="text-xs font-bold mb-1.5" style={{ color: '#92400e' }}>
                  촬영 방법 (토스증권)
                </div>
                <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: '#78350f' }}>
                  <li>토스증권 앱 → 하단 증권 탭</li>
                  <li>보유 종목이 모두 보이도록 스크롤</li>
                  <li>화면 캡처 후 여기에 업로드</li>
                </ol>
              </div>
            </div>
          )}

          {/* ── Loading stage ── */}
          {stage === 'loading' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div
                className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: `${accentHex}40`, borderTopColor: accentHex }}
              />
              <div className="text-sm font-semibold" style={{ color: '#64748b' }}>
                인식 중...
              </div>
              <div className="text-xs text-center" style={{ color: '#94a3b8' }}>
                AI가 스크린샷에서 종목 정보를 읽고 있어요
              </div>
            </div>
          )}

          {/* ── Review stage ── */}
          {stage === 'review' && (
            <div className="space-y-4">
              {/* Warnings */}
              {(hasLowConfidence || hasMissingTicker) && (
                <div
                  className="rounded-2xl px-4 py-3 flex items-start gap-2"
                  style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}
                >
                  <span className="text-sm shrink-0">⚠️</span>
                  <div className="text-xs leading-relaxed" style={{ color: '#9a3412' }}>
                    자동 인식 결과가 부정확할 수 있어요. 분석 전 꼭 확인해주세요.
                    {hasMissingTicker && (
                      <span className="block mt-1 font-bold">
                        티커를 알 수 없는 종목이 있어요. 직접 입력하거나 해당 행을 삭제해주세요.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* US stock KRW notice */}
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className="rounded-2xl px-4 py-2.5 text-xs"
                  style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }}
                >
                  ℹ️ {w}
                </div>
              ))}

              {/* Row count */}
              <div className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
                인식된 종목 {rows.length}개 · 수정 후 분석하세요
              </div>

              {/* Review rows */}
              <div className="space-y-3">
                {rows.map((row) => (
                  <ReviewRowCard
                    key={row.id}
                    row={row}
                    accentHex={accentHex}
                    onUpdate={(patch) => updateRow(row.id, patch)}
                    onRemove={() => removeRow(row.id)}
                  />
                ))}
              </div>

              {rows.length === 0 && (
                <div
                  className="rounded-2xl py-10 text-center"
                  style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}
                >
                  <div className="text-sm" style={{ color: '#94a3b8' }}>
                    모든 종목이 삭제되었어요
                  </div>
                </div>
              )}

              {errorMsg && (
                <div
                  className="rounded-xl px-4 py-3 text-xs"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
                >
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* ── Error stage ── */}
          {stage === 'error' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="text-4xl">😔</div>
              <div className="text-center">
                <div className="text-sm font-bold" style={{ color: '#1c1c1e' }}>
                  인식에 실패했어요
                </div>
                <div
                  className="text-xs mt-1 leading-relaxed max-w-xs mx-auto"
                  style={{ color: '#64748b' }}
                >
                  {errorMsg ?? '다시 시도해주세요.'}
                </div>
              </div>
              <button
                onClick={() => { setErrorMsg(null); setStage('upload'); }}
                className="rounded-xl px-6 py-2.5 text-sm font-bold"
                style={{ background: accentHex, color: 'white' }}
              >
                다시 시도
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {stage === 'review' && (
          <div
            className="px-5 pb-5 pt-3 shrink-0 space-y-2"
            style={{ borderTop: '1px solid #f1f5f9' }}
          >
            <div className="text-[10px] text-center" style={{ color: '#94a3b8' }}>
              분석에 포함되지 않는 종목은 ✕ 버튼으로 삭제하세요
            </div>
            <button
              onClick={() => void handleConfirm()}
              disabled={confirming || rows.length === 0}
              className="w-full rounded-2xl py-4 text-base font-black disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              style={{ background: accentHex, color: 'white' }}
            >
              {confirming ? '확인 중...' : '이대로 분석하기'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Review Row Card ────────────────────────────────────────────────────────

interface ReviewRowCardProps {
  row: ReviewRow;
  accentHex: string;
  onUpdate: (patch: Partial<ReviewRow>) => void;
  onRemove: () => void;
}

function ReviewRowCard({ row, accentHex, onUpdate, onRemove }: ReviewRowCardProps) {
  const missingTicker = row.ticker.trim() === '';
  const isLow = row.confidence === 'low' || missingTicker;

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: '#ffffff',
        border: `1.5px solid ${isLow ? '#fca5a5' : row.confidence === 'medium' ? '#fde68a' : '#e8ecf4'}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Row header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black truncate" style={{ color: '#1c1c1e' }}>
            {row.stockName}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                background: row.market === 'US' ? '#eff6ff' : '#f0fdf4',
                color: row.market === 'US' ? '#1e40af' : '#166534',
              }}
            >
              {row.market === 'US' ? '해외' : '국내'}
            </span>
            <ConfidenceBadge level={isLow ? 'low' : row.confidence} />
          </div>
        </div>
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
          style={{ background: '#fee2e2', color: '#ef4444' }}
        >
          ✕
        </button>
      </div>

      {/* Ticker input */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: '#94a3b8' }}>
          티커
        </label>
        <input
          value={row.ticker}
          onChange={(e) => onUpdate({ ticker: e.target.value.toUpperCase() })}
          placeholder="예: 005930.KS · AAPL"
          className="w-full rounded-xl px-3 py-2 text-sm font-bold outline-none transition-all"
          style={{
            background: '#f8fafc',
            border: `1.5px solid ${missingTicker ? '#fca5a5' : '#e8ecf4'}`,
            color: '#1c1c1e',
          }}
          onFocus={(e) => (e.target.style.borderColor = accentHex)}
          onBlur={(e) =>
            (e.target.style.borderColor = missingTicker ? '#fca5a5' : '#e8ecf4')
          }
        />
      </div>

      {/* Numeric fields grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Quantity */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: '#94a3b8' }}>
            수량 (주)
          </label>
          <input
            value={row.quantity}
            onChange={(e) =>
              onUpdate({ quantity: e.target.value.replace(/[^0-9]/g, '') })
            }
            placeholder="0"
            className="w-full rounded-xl px-3 py-2 text-sm font-semibold outline-none transition-all"
            style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4', color: '#1c1c1e' }}
            onFocus={(e) => (e.target.style.borderColor = accentHex)}
            onBlur={(e) => (e.target.style.borderColor = '#e8ecf4')}
          />
        </div>

        {/* Market toggle */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: '#94a3b8' }}>
            시장
          </label>
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid #e8ecf4' }}>
            {(['KR', 'US'] as const).map((m) => (
              <button
                key={m}
                onClick={() => onUpdate({ market: m })}
                className="flex-1 py-2 text-xs font-bold transition-all"
                style={{
                  background: row.market === m ? accentHex : 'transparent',
                  color: row.market === m ? 'white' : '#6b7280',
                }}
              >
                {m === 'KR' ? '국내' : '해외'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: '#94a3b8' }}>
            평가금액 (원)
          </label>
          <input
            value={row.evaluationAmountKRW}
            onChange={(e) =>
              onUpdate({ evaluationAmountKRW: e.target.value.replace(/[^0-9]/g, '') })
            }
            placeholder="0"
            className="w-full rounded-xl px-3 py-2 text-sm font-semibold outline-none transition-all"
            style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4', color: '#1c1c1e' }}
            onFocus={(e) => (e.target.style.borderColor = accentHex)}
            onBlur={(e) => (e.target.style.borderColor = '#e8ecf4')}
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: '#94a3b8' }}>
            평가손익 (원)
          </label>
          <input
            value={row.profitLossKRW}
            onChange={(e) => onUpdate({ profitLossKRW: e.target.value.replace(/[^0-9-]/g, '') })}
            placeholder="+0 또는 -0"
            className="w-full rounded-xl px-3 py-2 text-sm font-semibold outline-none transition-all"
            style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4', color: '#1c1c1e' }}
            onFocus={(e) => (e.target.style.borderColor = accentHex)}
            onBlur={(e) => (e.target.style.borderColor = '#e8ecf4')}
          />
        </div>
      </div>

      {/* Inferred avg cost (read-only) */}
      <div
        className="rounded-xl px-3 py-2 flex items-center justify-between"
        style={{ background: '#f8fafc', border: '1px solid #e8ecf4' }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
          추정 평단가
        </span>
        <span className="text-xs font-bold" style={{ color: '#1c1c1e' }}>
          {row.inferredAvgCostKRW != null
            ? `${fmtKRW(row.inferredAvgCostKRW)}${row.market === 'US' ? ' (KRW)' : ''}`
            : '—'}
        </span>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const TickerModal = dynamic(() => import('@/components/TickerModal'), { ssr: false });
const BeginnerGuide = dynamic(() => import('@/components/BeginnerGuide'), { ssr: false });
import type { BeginnerResult } from '@/components/BeginnerGuide';
import { PortflowLogo } from '@/components/PortflowLogo';
import { buildRiskTags, buildRiskExplanation } from '@/lib/riskSignal';
import type { QuoteMin } from '@/lib/riskSignal';
import {
  addPortfolioItem,
  analyzePortfolio,
  clearPortfolioItems,
  createPortfolio,
  changeMyPassword,
  deletePortfolio,
  getCurrentPrices,
  getDataFreshness,
  getExchangeRate,
  getPortfolioItems,
  getPortfolios,
  getSecurities,
  getStateEvents,
  getVapidPublicKey,
  markAllEventsRead,
  markEventRead,
  registerPushSubscription,
  updatePortfolio,
} from '@/lib/api';
import {
  AnalysisResult,
  BaselineDrift,
  PersonalReturn,
  Portfolio,
  PortfolioInputItem,
  RebalanceAction,
  SavedPortfolioItem,
  ScoreRule,
  Security,
  StateEvent,
} from '@/types';
import { useAuth } from '@/contexts/AuthContext';

type InputMode = 'amount' | 'weight';

// ── 아이콘 ────────────────────────────────────────────────────────────────────
type IconProps = { className?: string; style?: React.CSSProperties };
function IconGrid({ className = '', style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}
function IconPieChart({ className = '', style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
    </svg>
  );
}
function IconShield({ className = '', style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function IconBarChart({ className = '', style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  );
}
function IconLogOut({ className = '', style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function IconPlus({ className = '', style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconTrash({ className = '', style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );
}
function IconX({ className = '', style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function IconCheck({ className = '', style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconWarning({ className = '', style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function IconLock({ className = '', style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function IconArrowRight({ className = '', style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

// ── 원형 게이지 ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 120, label }: { score: number; size?: number; label?: string }) {
  const sw = Math.round(size * 0.08);
  const r = (size - sw * 2) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const prog = (Math.max(0, Math.min(100, score)) / 100) * circ;
  const color = score >= 80 ? '#059669' : score >= 60 ? '#f59e0b' : '#ef4444';
  const trackColor = score >= 80 ? 'rgba(5,150,105,0.12)' : score >= 60 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';
  const statusLabel = score >= 80 ? 'OPTIMAL' : score >= 60 ? 'GOOD' : score >= 40 ? 'FAIR' : 'RISK';
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={trackColor} strokeWidth={sw} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${prog} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`} />
        <text x={cx} y={cx - 4} textAnchor="middle" dominantBaseline="middle"
          fill="#1c1c1e" fontSize={Math.round(size * 0.28)} fontWeight="800">{score}</text>
        <text x={cx} y={cx + Math.round(size * 0.2)} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={Math.round(size * 0.1)} fontWeight="700" letterSpacing="1">
          {statusLabel}
        </text>
      </svg>
      {label && <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>}
    </div>
  );
}

// ── 섹터 색상 ─────────────────────────────────────────────────────────────────
const SECTOR_COLORS = [
  '#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#3b82f6', '#ec4899', '#84cc16', '#f97316',
];

export default function AnalyzerPage() {
  const router = useRouter();
  const { user, logout, isLoggedIn, isLoading: authLoading, openModal } = useAuth();
  const [portfolioName, setPortfolioName] = useState('My Portfolio');
  const [inputMode, setInputMode] = useState<InputMode>('amount');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Security[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [items, setItems] = useState<PortfolioInputItem[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedPortfolios, setSavedPortfolios] = useState<Portfolio[]>([]);
  const [currentPortfolioId, setCurrentPortfolioId] = useState<number | null>(null);
  const [loadingPortfolioId, setLoadingPortfolioId] = useState<number | null>(null);
  const [deletingPortfolioId, setDeletingPortfolioId] = useState<number | null>(null);
  const [sidebarError, setSidebarError] = useState<string | null>(null);
  const [lastPriceDate, setLastPriceDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'result'>('input');
  const [showDetails, setShowDetails] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [news, setNews] = useState<{ title: string; link: string; pubDate: string; source: string; ticker?: string | null }[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsQuery, setNewsQuery] = useState('');
  const [newsQueryInput, setNewsQueryInput] = useState('');
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [beginnerGuideOpen, setBeginnerGuideOpen] = useState(false);
  const [beginnerResult, setBeginnerResult] = useState<BeginnerResult | null>(null);
  const [tickerQuotes, setTickerQuotes] = useState<Record<string, QuoteMin>>({});
  const [adjustType, setAdjustType] = useState<'add' | 'withdraw'>('add');
  const [adjustInput, setAdjustInput] = useState('');
  const [notifications, setNotifications] = useState<StateEvent[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const tickerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of items) map[item.ticker] = item.displayNameKo ?? item.name ?? item.ticker;
    return map;
  }, [items]);

  const sectorKo: Record<string, string> = {
    'Information Technology': 'IT', 'Financials': '금융', 'Health Care': '헬스케어',
    'Consumer Discretionary': '경기소비재', 'Communication Services': '커뮤니케이션',
    'Industrials': '산업재', 'Consumer Staples': '필수소비재', 'Energy': '에너지',
    'Materials': '소재', 'Real Estate': '부동산', 'Utilities': '유틸리티',
    'Unknown': '기타', 'ETF': 'ETF', 'Cash': '현금',
  };
  const sectorLabel = (s: string) => sectorKo[s] ?? s;

  const divScoreLabel = (s: number) => {
    if (s < 40) return { text: '위험', color: '#ef4444' };
    if (s < 60) return { text: '보통', color: '#f59e0b' };
    if (s < 80) return { text: '양호', color: '#a78bfa' };
    return { text: '우수', color: '#10b981' };
  };

  const formatAmount = (n: number) => n > 0 ? Math.round(n).toLocaleString('ko-KR') : '';

  const loadSavedPortfolios = async () => {
    try { setSavedPortfolios(await getPortfolios()); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { openModal(); return; }
    loadSavedPortfolios();
    getDataFreshness().then((d) => setLastPriceDate(d.lastPriceDate)).catch(() => {});
    getExchangeRate().then((r) => setUsdKrw({ rate: r.rate, midRate: r.midRate })).catch(() => {});
    getStateEvents().then((evts) => setNotifications(evts)).catch(() => {});

    // Service Worker 등록 + 기존 구독 여부 확인
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(async (reg) => {
        const existing = await reg.pushManager.getSubscription();
        if (existing) setPushEnabled(true);
      }).catch(() => {});
    }

    setNewsLoading(true);
    fetch('/api/news').then((r) => r.json()).then((d) => setNews(d.items ?? [])).catch(() => {}).finally(() => setNewsLoading(false));
  }, [authLoading, isLoggedIn]);

  // 티커 또는 검색어 기반 뉴스 갱신
  function fetchPersonalizedNews(tickers: string[], query: string) {
    setNewsLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    else if (tickers.length) params.set('tickers', tickers.join(','));
    fetch(`/api/news?${params}`).then((r) => r.json()).then((d) => setNews(d.items ?? [])).catch(() => {}).finally(() => setNewsLoading(false));
  }

  const [applyingRebalance, setApplyingRebalance] = useState(false);
  const [prevAnalysis, setPrevAnalysis] = useState<AnalysisResult | null>(null);
  const [rebalanceAppliedAt, setRebalanceAppliedAt] = useState<Date | null>(null);
  const [tickerModal, setTickerModal] = useState<{ ticker: string; displayName?: string; rebalanceAction?: RebalanceAction; drift?: BaselineDrift } | null>(null);
  const [usdKrw, setUsdKrw] = useState<{ rate: number; midRate: number } | null>(null);
  const [customUsdKrw, setCustomUsdKrw] = useState<string>('');

  const ACCENT_PRESETS = [
    { name: 'Violet', hex: '#7c3aed', light: '#ede9fe', shadow: 'rgba(124,58,237,0.18)' },
    { name: 'Emerald', hex: '#059669', light: '#d1fae5', shadow: 'rgba(5,150,105,0.18)' },
    { name: 'Sky', hex: '#0284c7', light: '#e0f2fe', shadow: 'rgba(2,132,199,0.18)' },
    { name: 'Rose', hex: '#e11d48', light: '#ffe4e6', shadow: 'rgba(225,29,72,0.18)' },
    { name: 'Amber', hex: '#d97706', light: '#fef3c7', shadow: 'rgba(217,119,6,0.18)' },
  ];
  const [accentIdx, setAccentIdx] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem('accent_idx') ?? '0');
  });
  const accent = ACCENT_PRESETS[accentIdx] ?? ACCENT_PRESETS[0];
  const setAccent = (i: number) => { setAccentIdx(i); localStorage.setItem('accent_idx', String(i)); };

  const isUS = (ticker: string) => !ticker.endsWith('.KS') && !ticker.endsWith('.KQ');
  const effectiveRate = () => customUsdKrw ? Number(customUsdKrw) : (usdKrw?.rate ?? 1400);
  const toKRW = (item: PortfolioInputItem) => isUS(item.ticker) ? Math.round(Number(item.amount || 0) * effectiveRate()) : Number(item.amount || 0);

  const totalAmount = useMemo(() => {
    const rate = customUsdKrw ? Number(customUsdKrw) : (usdKrw?.rate ?? 1400);
    return items.reduce((sum, item) => {
      const amt = Number(item.amount || 0);
      return sum + (isUS(item.ticker) ? amt * rate : amt);
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, usdKrw, customUsdKrw]);
  const totalWeight = useMemo(() => items.reduce((sum, item) => sum + Number(item.weight || 0), 0), [items]);

  const getItemWeight = (item: PortfolioInputItem): number => {
    if (inputMode === 'amount' && totalAmount > 0) return (toKRW(item) / totalAmount) * 100;
    return Number(item.weight || 0);
  };

  const handleApplyRebalance = async () => {
    if (!analysis?.rebalanceResult || !currentPortfolioId) return;
    try {
      setApplyingRebalance(true);
      const capturedPrev = analysis;

      // ── 원금 총액 캡처 (금액 모드, KRW 환산) ──
      const capturedTotalAmount = totalAmount; // already in KRW (US converted by effectiveRate)
      const hasAmounts = capturedTotalAmount > 0;

      // ── 1. 기존 포트폴리오 백업 복사본 생성 (Before #1, #2... 순번) ──
      const existingBackupNums = savedPortfolios
        .map((p) => { const m = p.name.match(/^(.+) · Before #(\d+)$/); return (m && m[1] === portfolioName) ? Number(m[2]) : 0; })
        .filter((n) => n > 0);
      const nextNum = existingBackupNums.length === 0 ? 1 : Math.max(...existingBackupNums) + 1;
      const backupName = `${portfolioName} · Before #${nextNum}`;
      const backup = await createPortfolio(backupName);
      const weightSum = items.reduce((s, i) => s + getItemWeight(i), 0);
      for (const item of items) {
        const w = weightSum > 0 ? Math.round((getItemWeight(item) / weightSum) * 1000) / 10 : getItemWeight(item);
        const storedAmt = toKRW(item);
        await addPortfolioItem(backup.id, item.securityId, {
          weight: w,
          ...(storedAmt > 0 ? { amount: storedAmt } : {}),
          ...(Number(item.avgCost) > 0 ? { avgCost: Number(item.avgCost) } : {}),
        });
      }

      // ── 2. 추천 비율로 현재 포트폴리오 재설정 ──
      const suggested = analysis.rebalanceResult.suggestedPortfolio;
      const newItems: PortfolioInputItem[] = [];

      for (const s of suggested) {
        const existing = items.find((i) => i.ticker === s.ticker);

        // 비중에 맞는 금액 자동 계산
        let calcAmount = 0; // state에 저장할 값: KR=KRW, US=USD
        if (hasAmounts) {
          const targetAmtKRW = capturedTotalAmount * (s.weight / 100);
          const rate = effectiveRate();
          if (!isUS(s.ticker)) {
            // 국내주식: 1주 단위 반올림 (KRW)
            const costPerShare = Number(existing?.avgCost || 0);
            if (costPerShare > 0) {
              const shares = Math.max(1, Math.round(targetAmtKRW / costPerShare));
              calcAmount = shares * costPerShare;
            } else {
              calcAmount = Math.round(targetAmtKRW / 1000) * 1000;
            }
          } else {
            // 미국주식: $1 단위, USD로 저장 (표시용)
            const targetUSD = targetAmtKRW / rate;
            calcAmount = Math.max(1, Math.round(targetUSD));
          }
        }

        if (existing) {
          newItems.push({ ...existing, weight: s.weight, amount: calcAmount });
        } else {
          try {
            const results = await getSecurities(s.ticker);
            const sec = results.find((r: Security) => r.ticker === s.ticker);
            if (sec) newItems.push({ securityId: sec.id, ticker: sec.ticker, name: sec.name, displayNameKo: sec.displayNameKo, weight: s.weight, amount: calcAmount, avgCost: 0 });
          } catch { /* skip */ }
        }
      }

      if (!newItems.length) return;

      // 새로 추가된 종목(avgCost=0)에 현재가를 평단가로 자동 설정
      const newSecIds = newItems.filter((i) => !i.avgCost).map((i) => i.securityId);
      if (newSecIds.length) {
        try {
          const prices = await getCurrentPrices(newSecIds);
          const priceMap: Record<number, number> = {};
          for (const p of prices) priceMap[p.securityId] = p.price;
          for (const item of newItems) {
            if (!item.avgCost && priceMap[item.securityId]) {
              item.avgCost = priceMap[item.securityId];
            }
          }
        } catch { /* ignore */ }
      }

      setItems(newItems);
      setInputMode(hasAmounts ? 'amount' : 'weight');
      await clearPortfolioItems(currentPortfolioId);
      for (const item of newItems) {
        const storedAmt = isUS(item.ticker) ? Math.round(item.amount * effectiveRate()) : item.amount;
        const opts = hasAmounts
          ? { amount: storedAmt, ...(Number(item.avgCost) > 0 ? { avgCost: Number(item.avgCost) } : {}) }
          : { weight: item.weight };
        await addPortfolioItem(currentPortfolioId, item.securityId, opts);
      }
      const result = await analyzePortfolio(currentPortfolioId, '1Y', 'SP500');
      setPrevAnalysis(capturedPrev);
      setAnalysis(result);
      setRebalanceAppliedAt(new Date());
      await loadSavedPortfolios();
    } catch { /* ignore */ } finally { setApplyingRebalance(false); }
  };

  const [applyingAdjustment, setApplyingAdjustment] = useState(false);

  const handleApplyAdjustment = async () => {
    if (!analysis?.rebalanceResult || !currentPortfolioId) return;
    const adjustAmt = Number(adjustInput.replace(/,/g, '')) || 0;
    if (adjustAmt <= 0) return;
    try {
      setApplyingAdjustment(true);
      const newTotal = adjustType === 'add' ? totalAmount + adjustAmt : Math.max(0, totalAmount - adjustAmt);
      const suggested = analysis.rebalanceResult.suggestedPortfolio;
      const rate = effectiveRate();

      // 1. 기존 종목 금액 업데이트
      const updatedItems: PortfolioInputItem[] = items.map((item) => {
        const sug = suggested.find((s) => s.ticker === item.ticker);
        if (!sug) return item;
        const targetKRW = Math.round((sug.weight / 100) * newTotal);
        const newAmt = isUS(item.ticker) ? Math.round(targetKRW / rate * 100) / 100 : targetKRW;
        return { ...item, amount: newAmt };
      });

      // 2. 새 종목 추가 (현재 items에 없는 suggested 티커)
      const existingTickers = new Set(items.map((i) => i.ticker));
      for (const sug of suggested) {
        if (existingTickers.has(sug.ticker)) continue;
        try {
          const secs = await getSecurities(sug.ticker);
          const sec = secs.find((s: Security) => s.ticker.toUpperCase() === sug.ticker.toUpperCase());
          if (sec) {
            const targetKRW = Math.round((sug.weight / 100) * newTotal);
            const displayAmt = isUS(sec.ticker) ? Math.round(targetKRW / rate * 100) / 100 : targetKRW;
            updatedItems.push({ securityId: sec.id, ticker: sec.ticker, name: sec.name, displayNameKo: sec.displayNameKo, weight: sug.weight, amount: displayAmt, avgCost: 0 });
          }
        } catch { /* 검색 실패 무시 */ }
      }

      // 3. 백엔드 저장
      await clearPortfolioItems(currentPortfolioId);
      for (const item of updatedItems) {
        const storedAmt = toKRW(item);
        await addPortfolioItem(currentPortfolioId, item.securityId, {
          amount: storedAmt,
          ...(Number(item.avgCost) > 0 ? { avgCost: Number(item.avgCost) } : {}),
        });
      }

      setItems(updatedItems);
      setInputMode('amount');
      setAdjustInput('');
      setAnalysis(null);
      setActiveTab('input');
    } catch { /* ignore */ } finally { setApplyingAdjustment(false); }
  };

  const handleChangeMyPassword = async () => {
    if (!pwNew.trim() || pwNew !== pwConfirm) {
      setPwMsg({ type: 'error', text: '새 비밀번호와 확인이 일치하지 않습니다.' });
      return;
    }
    try {
      setPwSaving(true); setPwMsg(null);
      await changeMyPassword(pwCurrent, pwNew);
      setPwMsg({ type: 'success', text: '비밀번호가 변경되었습니다.' });
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
    } catch (e: any) {
      setPwMsg({ type: 'error', text: e.message || '변경에 실패했습니다.' });
    } finally { setPwSaving(false); }
  };

  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      setPushLoading(true);
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      await registerPushSubscription(sub.toJSON() as PushSubscriptionJSON);
      setPushEnabled(true);
    } catch (err) {
      console.error('Push subscription failed', err);
    } finally {
      setPushLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    try { setError(null); setLoadingSearch(true); setSearchDone(false); setSearchResults(await getSecurities(search)); setSearchDone(true); }
    catch { setError('종목 검색에 실패했습니다.'); setSearchDone(true); }
    finally { setLoadingSearch(false); }
  };

  const addItem = (security: Security) => {
    if (items.some((item) => item.securityId === security.id)) return;
    setItems((prev) => [...prev, { securityId: security.id, ticker: security.ticker, name: security.name, displayNameKo: security.displayNameKo, weight: 0, amount: 0, avgCost: 0 }]);
    setSearchResults([]); setSearch(''); setSearchDone(false);
  };

  const updateAmount = (id: number, amount: number) => setItems((prev) => prev.map((i) => i.securityId === id ? { ...i, amount } : i));
  const updateWeight = (id: number, weight: number) => setItems((prev) => prev.map((i) => i.securityId === id ? { ...i, weight } : i));
  const updateAvgCost = (id: number, avgCost: number) => setItems((prev) => prev.map((i) => i.securityId === id ? { ...i, avgCost } : i));
  const removeItem = (id: number) => setItems((prev) => prev.filter((i) => i.securityId !== id));

  const handleAnalyze = async () => {
    try {
      setError(null);
      if (!items.length) { setError('종목을 하나 이상 추가하세요.'); return; }
      if (inputMode === 'amount') {
        if (totalAmount === 0) { setError('투자금액을 입력하세요.'); return; }
        if (items.some((i) => Number(i.amount) <= 0)) { setError('모든 종목에 투자금액을 입력하세요.'); return; }
      } else {
        if (Math.round(totalWeight * 100) / 100 !== 100) { setError(`비중 합계가 100%여야 합니다. (현재: ${totalWeight.toFixed(1)}%)`); return; }
      }
      // 중복 이름 체크
      const trimmedName = portfolioName.trim();
      const duplicate = savedPortfolios.find(
        (p) => p.name.trim() === trimmedName && p.id !== currentPortfolioId,
      );
      if (duplicate) {
        setError(`"${trimmedName}" 이름의 포트폴리오가 이미 있어요. 다른 이름을 사용해주세요.`);
        return;
      }

      setLoadingAnalyze(true);
      let portfolioId: number;
      if (currentPortfolioId) {
        await clearPortfolioItems(currentPortfolioId);
        await updatePortfolio(currentPortfolioId, trimmedName);
        portfolioId = currentPortfolioId;
      } else {
        portfolioId = (await createPortfolio(trimmedName)).id;
      }
      for (const item of items) {
        const avgCost = Number(item.avgCost) > 0 ? Number(item.avgCost) : undefined;
        const storedAmount = toKRW(item); // US stocks converted to KRW for backend weight calc
        const options = inputMode === 'amount' ? { amount: storedAmount, avgCost } : { weight: Number(item.weight), avgCost };
        await addPortfolioItem(portfolioId, item.securityId, options);
      }
      const result = await analyzePortfolio(portfolioId, '1Y', 'SP500');
      setAnalysis(result); setCurrentPortfolioId(portfolioId); setActiveTab('result');
      // refresh notifications after analysis (detection runs async server-side)
      setTimeout(() => getStateEvents().then((evts) => setNotifications(evts)).catch(() => {}), 2000);
      fetchPersonalizedNews(items.map((i) => i.ticker), newsQuery);
      // fetch quote data for risk signals (non-blocking)
      const _token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') ?? '') : '';
      const _api = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
      const _captured = [...items];
      Promise.all(_captured.map((item) =>
        fetch(`${_api}/securities/${encodeURIComponent(item.ticker)}/quote`, {
          headers: _token ? { Authorization: `Bearer ${_token}` } : {},
        }).then((r) => r.ok ? r.json() : null).then((d) => d ? [item.ticker, d] as const : null).catch(() => null)
      )).then((results) => {
        const map: Record<string, QuoteMin> = {};
        for (const r of results) {
          if (r) {
            const [ticker, d] = r;
            map[ticker] = { pe: d.pe ?? null, fiftyTwoWeekHigh: d.fiftyTwoWeekHigh ?? null, fiftyTwoWeekLow: d.fiftyTwoWeekLow ?? null, debtToEquity: d.debtToEquity ?? null, revenueGrowth: d.revenueGrowth ?? null, history: (d.history ?? []).map((h: { time: string; close: number }) => ({ time: h.time, close: h.close })) };
          }
        }
        setTickerQuotes(map);
      });
      await loadSavedPortfolios();
    } catch { setError('분석에 실패했습니다. 백엔드 서버를 확인하세요.'); }
    finally { setLoadingAnalyze(false); }
  };

  const handleLoadPortfolio = async (portfolio: Portfolio) => {
    try {
      setLoadingPortfolioId(portfolio.id);
      const data: SavedPortfolioItem[] = await getPortfolioItems(portfolio.id);
      setPortfolioName(portfolio.name);
      const hasAmounts = data.some((item) => item.amount !== null && Number(item.amount) > 0);
      setInputMode(hasAmounts ? 'amount' : 'weight');
      const rate = customUsdKrw ? Number(customUsdKrw) : (usdKrw?.rate ?? 1400);
      setItems(data.map((item) => {
        const ticker = item.security.ticker;
        const storedAmt = Number(item.amount ?? 0);
        const displayAmt = isUS(ticker) && storedAmt > 0 ? Math.round(storedAmt / rate * 100) / 100 : storedAmt;
        return { securityId: item.securityId, ticker, name: item.security.name, displayNameKo: item.security.displayNameKo, weight: Number(item.weight), amount: displayAmt, avgCost: Number(item.avgCost ?? 0) };
      }));
      setCurrentPortfolioId(portfolio.id); setAnalysis(null); setError(null); setActiveTab('input');
      setMobileSidebarOpen(false);
    } catch { setError('포트폴리오 불러오기에 실패했습니다.'); }
    finally { setLoadingPortfolioId(null); }
  };

  const handleDeletePortfolio = async (e: React.MouseEvent, portfolio: Portfolio) => {
    e.stopPropagation();
    if (!window.confirm(`"${portfolio.name}" 포트폴리오를 삭제하시겠습니까?`)) return;
    try {
      setSidebarError(null); setDeletingPortfolioId(portfolio.id);
      await deletePortfolio(portfolio.id);
      setSavedPortfolios((prev) => prev.filter((p) => p.id !== portfolio.id));
      if (currentPortfolioId === portfolio.id) setCurrentPortfolioId(null);
    } catch (e) { setSidebarError(`삭제 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`); }
    finally { setDeletingPortfolioId(null); }
  };

  const handleCheckout = async () => {
    if (!currentPortfolioId || checkoutLoading) return;
    try {
      setCheckoutLoading(true);
      const { loadTossPayments, ANONYMOUS } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? '');
      const payment = tossPayments.payment({ customerKey: ANONYMOUS });
      await payment.requestPayment({
        method: 'CARD', amount: { currency: 'KRW', value: 2900 },
        orderId: `portfolio-${currentPortfolioId}-${Date.now()}`,
        orderName: '포트폴리오 상세 리밸런싱 가이드',
        successUrl: `${window.location.origin}/payment/success?portfolioId=${currentPortfolioId}`,
        failUrl: `${window.location.origin}/analyzer`,
      });
    } catch (e) { console.error('[Toss]', e); setError('결제 페이지 이동에 실패했습니다.'); setCheckoutLoading(false); }
  };

  const retColor = (v: number) => v > 0 ? 'text-green-600' : v < 0 ? 'text-red-600' : 'text-gray-400';

  const riskLabel = (score: number) => {
    if (score >= 80) return { text: '안전', color: '#10b981' };
    if (score >= 60) return { text: '양호', color: '#3b82f6' };
    if (score >= 40) return { text: '주의', color: '#f59e0b' };
    return { text: '위험', color: '#ef4444' };
  };

  // ── 알림 드롭다운 내용 (모바일/데스크탑 공유) ────────────────────────────
  const severityColor = (s: string) => s === 'critical' ? '#ef4444' : s === 'opportunity' ? '#10b981' : s === 'warning' ? '#f59e0b' : '#6b7280';
  const renderNotifDropdown = () => {
    const unread = notifications.filter((n) => !n.isRead).length;
    return (
      <>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <span className="text-sm font-bold text-[#1c1c1e]">알림</span>
          {unread > 0 && (
            <button
              onClick={async () => { await markAllEventsRead(); setNotifications((n) => n.map((e) => ({ ...e, isRead: true }))); }}
              className="text-[11px] font-semibold"
              style={{ color: accent.hex }}
            >
              모두 읽음
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-2xl mb-2">🔔</div>
              <div className="text-sm font-medium text-[#1c1c1e]">알림이 없어요</div>
              <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>포트폴리오 분석 후 변화가 감지되면 알려드릴게요</div>
            </div>
          ) : (
            notifications.slice(0, 15).map((n) => (
              <div
                key={n.id}
                className="px-4 py-3 cursor-pointer transition-all"
                style={{ background: n.isRead ? 'transparent' : `${severityColor(n.severity)}08`, borderBottom: '1px solid #f8fafc' }}
                onClick={async () => {
                  if (!n.isRead) {
                    await markEventRead(n.id).catch(() => {});
                    setNotifications((prev) => prev.map((e) => e.id === n.id ? { ...e, isRead: true } : e));
                  }
                  setNotifOpen(false);
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: n.isRead ? '#e2e8f0' : severityColor(n.severity) }} />
                  <div className="min-w-0">
                    {(() => {
                      const pName = savedPortfolios.find((p) => p.id === n.portfolioId)?.name;
                      return pName ? (
                        <div className="text-[10px] font-semibold mb-0.5 px-1.5 py-0.5 rounded-full inline-block" style={{ background: accent.light, color: accent.hex }}>{pName}</div>
                      ) : null;
                    })()}
                    <div className="text-xs font-bold text-[#1c1c1e] leading-snug">{n.title}</div>
                    <div className="text-[11px] mt-0.5 leading-snug" style={{ color: '#64748b' }}>{n.message}</div>
                    <div className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>{new Date(n.detectedAt).toLocaleDateString('ko-KR')}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {typeof window !== 'undefined' && 'Notification' in window && (
          <div className="px-4 py-3" style={{ borderTop: '1px solid #f1f5f9' }}>
            {pushEnabled ? (
              <div className="flex items-center gap-2 text-xs" style={{ color: '#10b981' }}>
                <span>●</span> 브라우저 알림 켜짐
              </div>
            ) : (
              <button
                onClick={handleEnablePush}
                disabled={pushLoading}
                className="w-full rounded-xl py-2 text-xs font-semibold transition-all disabled:opacity-50"
                style={{ background: accent.light, color: accent.hex }}
              >
                {pushLoading ? '요청 중...' : '🔔 브라우저 알림 켜기'}
              </button>
            )}
          </div>
        )}
      </>
    );
  };

  // ── 사이드바 내용 (공통) ──────────────────────────────────────────────────
  const SidebarContent = () => (
    <>
      {/* 로고 */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <PortflowLogo height={30} />
      </div>

      {/* 포트폴리오 목록 */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-2" style={{ color: '#94a3b8' }}>
          내 포트폴리오
        </div>

        {sidebarError && (
          <p className="text-xs px-2 py-1.5 mb-2 rounded-lg" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)' }}>{sidebarError}</p>
        )}

        {savedPortfolios.length === 0 ? (
          <div className="text-xs px-2 py-3" style={{ color: '#cbd5e1' }}>포트폴리오가 없습니다</div>
        ) : (
          <div className="space-y-0.5">
            {savedPortfolios.map((p) => (
              <div key={p.id} className="flex gap-1 group">
                <button
                  onClick={() => handleLoadPortfolio(p)}
                  disabled={loadingPortfolioId === p.id}
                  className="flex-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all min-w-0 disabled:opacity-50"
                  style={{
                    background: currentPortfolioId === p.id ? accent.light : 'transparent',
                    color: currentPortfolioId === p.id ? accent.hex : '#64748b',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: currentPortfolioId === p.id ? accent.hex : '#94a3b8' }} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: currentPortfolioId === p.id ? '#1a1d2e' : '#374151' }}>{p.name}</div>
                    <div className="text-[10px]" style={{ color: '#94a3b8' }}>{new Date(p.createdAt).toLocaleDateString('ko-KR')}</div>
                  </div>
                </button>
                <button
                  onClick={(e) => handleDeletePortfolio(e, p)}
                  disabled={deletingPortfolioId === p.id}
                  className="opacity-0 group-hover:opacity-100 w-7 shrink-0 flex items-center justify-center rounded-lg transition-all"
                  style={{ color: '#94a3b8' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
                >
                  <IconTrash className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 새 포트폴리오 버튼 */}
        <button
          onClick={() => { setPortfolioName('새 포트폴리오'); setItems([]); setCurrentPortfolioId(null); setAnalysis(null); setActiveTab('input'); setMobileSidebarOpen(false); }}
          className="flex items-center gap-2 w-full mt-3 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all"
          style={{ color: accent.hex, border: `1px dashed ${accent.hex}50` }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = accent.light; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <IconPlus className="w-3.5 h-3.5" /> 새 포트폴리오
        </button>
      </div>

      {/* 하단 유저 정보 */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
        {/* 트라이얼 뱃지 */}
        {user?.trialEndsAt && new Date(user.trialEndsAt) > new Date() && (() => {
          const daysLeft = Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000));
          return (
            <div className="mb-3 rounded-xl px-3 py-2 flex items-center justify-between" style={{ background: accent.light, border: `1px solid ${accent.hex}40` }}>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: accent.hex }}>무료 체험 중</div>
                <div className="text-xs font-bold text-[#1c1c1e] mt-0.5">{daysLeft}일 남음</div>
              </div>
              <div className="text-2xl font-black" style={{ color: accent.hex }}>D-{daysLeft}</div>
            </div>
          );
        })()}
        {lastPriceDate && (
          <div className="text-[10px] mb-3 px-1" style={{ color: '#cbd5e1' }}>
            데이터 기준: {lastPriceDate}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: '#1c1c1e' }}>{user?.name || user?.email}</div>
            <div className="text-[11px] truncate" style={{ color: '#6b7280' }}>{user?.email}</div>
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <button
              onClick={() => { setPwModalOpen(true); setPwMsg(null); setPwCurrent(''); setPwNew(''); setPwConfirm(''); }}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: '#6b7280' }}
              title="비밀번호 변경"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#1c1c1e'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.07)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
            </button>
            <button
              onClick={() => { logout(); openModal(); }}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: '#6b7280' }}
              title="로그아웃"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#1c1c1e'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.07)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <IconLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 액센트 컬러 선택 */}
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
          <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#9ca3af' }}>테마 컬러</div>
          <div className="flex gap-1.5">
            {ACCENT_PRESETS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => setAccent(i)}
                title={p.name}
                className="w-5 h-5 rounded-full transition-all"
                style={{
                  background: p.hex,
                  outline: accentIdx === i ? `2px solid ${p.hex}` : 'none',
                  outlineOffset: '2px',
                  transform: accentIdx === i ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f3ee', color: '#1c1c1e' }}>

      {/* ── 데스크탑 사이드바 ── */}
      <aside
        className="hidden lg:flex flex-col fixed h-full z-20"
        style={{ width: 220, background: '#eeeae2', borderRight: '1px solid rgba(0,0,0,0.08)' }}
      >
        <SidebarContent />
      </aside>

      {/* ── 모바일 사이드바 오버레이 ── */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative z-10 flex flex-col" style={{ width: 260, background: '#eeeae2', borderRight: '1px solid rgba(0,0,0,0.08)' }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── 비밀번호 변경 모달 ── */}
      {pwModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm space-y-4" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <h3 className="text-base font-bold text-[#1c1c1e]">비밀번호 변경</h3>
            <input
              type="password"
              placeholder="현재 비밀번호"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-[#1c1c1e] text-sm outline-none"
              style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4' }}
            />
            <input
              type="password"
              placeholder="새 비밀번호"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-[#1c1c1e] text-sm outline-none"
              style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4' }}
            />
            <input
              type="password"
              placeholder="새 비밀번호 확인"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChangeMyPassword()}
              className="w-full rounded-xl px-4 py-3 text-[#1c1c1e] text-sm outline-none"
              style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4' }}
            />
            {pwMsg && (
              <div className={`text-xs px-3 py-2 rounded-lg ${pwMsg.type === 'success' ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800' : 'bg-red-950/50 text-red-300 border border-red-800'}`}>
                {pwMsg.text}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleChangeMyPassword}
                disabled={pwSaving || !pwCurrent.trim() || !pwNew.trim() || !pwConfirm.trim()}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
                style={{ background: accent.hex, color: 'white', boxShadow: `0 4px 15px ${accent.shadow}` }}
              >
                {pwSaving ? '변경 중...' : '변경'}
              </button>
              <button
                onClick={() => setPwModalOpen(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold"
                style={{ background: '#f1f5f9', color: '#64748b' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 메인 영역 ── */}
      <main className="flex-1 flex flex-col" style={{ marginLeft: 0 }}>
        <div className="lg:ml-[220px] flex-1 flex flex-col">

          {/* 모바일 상단바 */}
          <header className="lg:hidden flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#f5f3ee' }}>
            <button onClick={() => setMobileSidebarOpen(true)} className="p-1.5 rounded-lg" style={{ color: '#64748b' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <PortflowLogo height={26} />
            <div className="flex items-center gap-2">
              {/* 모바일 알림 벨 */}
              {(() => {
                const unread = notifications.filter((n) => !n.isRead).length;
                return (
                  <div className="relative">
                    <button
                      onClick={() => setNotifOpen((o) => !o)}
                      className="relative w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ color: '#64748b' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      </svg>
                      {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 rounded-full flex items-center justify-center font-black text-white" style={{ background: '#ef4444', minWidth: 16, height: 16, fontSize: 9 }}>
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </button>
                    {notifOpen && (
                      <div className="fixed z-50 rounded-2xl shadow-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e8ecf4', top: 56, left: 16, right: 16 }}>
                        {/* 드롭다운 내용은 아래 데스크탑 버전과 공유 */}
                        {renderNotifDropdown()}
                      </div>
                    )}
                  </div>
                );
              })()}
              <button onClick={() => { logout(); openModal(); }} style={{ color: '#94a3b8' }}>
                <IconLogOut className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              </button>
            </div>
          </header>

          {/* ── 페이지 헤더 ── */}
          <div className="px-4 lg:px-10 pt-4 lg:pt-8 pb-4 lg:pb-6" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
              <div>
                <h1 className="hidden lg:block">
                  <PortflowLogo height={42} />
                </h1>
                <p className="hidden lg:block text-sm mt-1.5" style={{ color: '#94a3b8' }}>
                  포트폴리오의 건강 상태를 진단하고 최적화 전략을 제안합니다
                </p>
                <button
                  onClick={() => setBeginnerGuideOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 transition-all hover:opacity-80"
                  style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}
                >
                  <span>🌱</span> 주식이 처음이신가요? 투자 성향 테스트
                </button>
              </div>

              {/* 데스크탑: 알림 벨 + 분석 결과 스탯 카드 */}
              <div className="hidden lg:flex items-start gap-3 shrink-0 flex-wrap">

              {/* 데스크탑 알림 벨 */}
              {(() => {
                const unread = notifications.filter((n) => !n.isRead).length;
                return (
                  <div className="relative">
                    <button
                      onClick={() => setNotifOpen((o) => !o)}
                      className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                      style={{ background: notifOpen ? accent.light : '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                      title="알림"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: notifOpen ? accent.hex : '#64748b' }}>
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      </svg>
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 rounded-full flex items-center justify-center font-black text-white" style={{ background: '#ef4444', minWidth: 18, height: 18, fontSize: 10 }}>
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </button>
                    {notifOpen && (
                      <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl shadow-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e8ecf4' }}>
                        {renderNotifDropdown()}
                      </div>
                    )}
                  </div>
                );
              })()}

              {analysis && (
                <div className="flex gap-3 flex-wrap">
                  <div className="rounded-2xl px-5 py-3.5 text-right" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>건강 점수</div>
                    <div className="font-black" style={{ fontSize: 28, color: analysis.healthScore >= 80 ? '#059669' : analysis.healthScore >= 60 ? '#f59e0b' : '#ef4444', lineHeight: 1 }}>
                      {analysis.healthScore}
                    </div>
                  </div>
                  <div className="rounded-2xl px-5 py-3.5 text-right" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>분산도</div>
                    <div className="font-black" style={{ fontSize: 28, color: '#10b981', lineHeight: 1 }}>
                      {analysis.diversificationScore}
                    </div>
                    {analysis.diversificationPercentile > 0 && (
                      <div className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>상위 {100 - analysis.diversificationPercentile}%</div>
                    )}
                  </div>
                  {analysis.isTrial && analysis.trialEndsAt && (
                    <div className="rounded-2xl px-5 py-3.5 text-right" style={{ background: accent.light, border: `1px solid ${accent.hex}40` }}>
                      <div className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: accent.hex }}>무료 체험</div>
                      <div className="font-black" style={{ fontSize: 18, lineHeight: 1, color: '#1c1c1e' }}>
                        D-{Math.max(0, Math.ceil((new Date(analysis.trialEndsAt).getTime() - Date.now()) / 86400000))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>

              {/* 모바일: 분석 결과 스탯 카드 */}
              {analysis && (
                <div className="flex lg:hidden gap-2 flex-wrap">
                  <div className="rounded-xl px-4 py-2.5 text-right" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>건강 점수</div>
                    <div className="font-black" style={{ fontSize: 22, color: analysis.healthScore >= 80 ? '#059669' : analysis.healthScore >= 60 ? '#f59e0b' : '#ef4444', lineHeight: 1 }}>
                      {analysis.healthScore}
                    </div>
                  </div>
                  <div className="rounded-xl px-4 py-2.5 text-right" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>분산도</div>
                    <div className="font-black" style={{ fontSize: 22, color: '#10b981', lineHeight: 1 }}>
                      {analysis.diversificationScore}
                    </div>
                  </div>
                  {analysis.isTrial && analysis.trialEndsAt && (
                    <div className="rounded-xl px-4 py-2.5 text-right" style={{ background: accent.light, border: `1px solid ${accent.hex}40` }}>
                      <div className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: accent.hex }}>무료 체험</div>
                      <div className="font-black" style={{ fontSize: 18, lineHeight: 1, color: '#1c1c1e' }}>
                        D-{Math.max(0, Math.ceil((new Date(analysis.trialEndsAt).getTime() - Date.now()) / 86400000))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>

            {/* 탭 (분석 결과가 있을 때) */}
            {analysis && (
              <div className="flex gap-1 mt-5 p-1 rounded-xl w-fit" style={{ background: '#e8ecf4' }}>
                {[{ key: 'input', label: '포트폴리오 편집' }, { key: 'result', label: '분석 대시보드' }].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as 'input' | 'result')}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: activeTab === t.key ? accent.hex : 'transparent',
                      color: activeTab === t.key ? 'white' : '#6b7280',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── 콘텐츠 ── */}
          <div className="flex-1 px-4 lg:px-10 py-4 lg:py-6 flex gap-6 items-start">

            {/* ── 메인 콘텐츠 (탭) ── */}
            <div className="flex-1 min-w-0">

            {/* ── 입력 탭 ── */}
            {activeTab === 'input' && (
              <div className="max-w-2xl space-y-5">

                {/* 초보자 가이드 결과 배너 */}
                {beginnerResult && (() => {
                  const styleMap = {
                    conservative: { label: '안정형', emoji: '🛡️', color: '#0284c7', bg: '#e0f2fe' },
                    balanced: { label: '균형형', emoji: '⚖️', color: '#7c3aed', bg: '#ede9fe' },
                    growth:       { label: '성장형', emoji: '🌱', color: '#0891b2', bg: '#e0f9ff' },
                    aggressive:   { label: '공격형', emoji: '🚀', color: '#059669', bg: '#d1fae5' },
                  };
                  const s = styleMap[beginnerResult.style] ?? styleMap.balanced;
                  const fmtAmt = (n: number) => n >= 1e4 ? `${Math.round(n / 1e4).toLocaleString()}만원` : `${n.toLocaleString()}원`;
                  return (
                    <div className="rounded-2xl p-4" style={{ background: s.bg, border: `1.5px solid ${s.color}30` }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{s.emoji}</span>
                          <div>
                            <div className="text-xs font-bold" style={{ color: s.color }}>{s.label} · 추천 포트폴리오</div>
                            <div className="text-sm font-black" style={{ color: '#1c1c1e' }}>주식 {beginnerResult.stockRatio}% + 안전자산 {beginnerResult.safeRatio}% · 총 {fmtAmt(beginnerResult.investAmount)}</div>
                          </div>
                        </div>
                        <button onClick={() => setBeginnerResult(null)} className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0" style={{ background: `${s.color}20`, color: s.color }}>✕</button>
                      </div>
                      {/* 예산 요약 */}
                      <div className="flex gap-2 mb-2 text-[11px]">
                        <span className="rounded-lg px-2 py-1 font-bold" style={{ background: `${s.color}18`, color: s.color }}>사용 {fmtAmt(beginnerResult.usedAmount)}</span>
                        <span className="rounded-lg px-2 py-1 font-bold" style={{ background: '#f1f5f9', color: '#64748b' }}>잔액 {fmtAmt(beginnerResult.remainingCash)}</span>
                      </div>
                      <div className="text-[10px] mb-2 px-1" style={{ color: '#f59e0b' }}>
                        ⚡ 평단가는 조회 시점 시세로 자동 입력됐어요. 실제 구매 단가가 다르면 직접 수정해주세요.
                      </div>
                      {beginnerResult.suggestions.length > 0 && (
                        <div className="space-y-1.5">
                          {beginnerResult.suggestions.map((sg) => (
                            <div key={sg.ticker} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.7)' }}>
                              <div>
                                <span className="font-black text-xs" style={{ color: '#1c1c1e' }}>{sg.ticker}</span>
                                <span className="ml-1.5 text-[11px]" style={{ color: '#64748b' }}>{sg.name}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold" style={{ color: s.color }}>{fmtAmt(sg.amountKRW)}</div>
                                {sg.suggestedShares != null && (
                                  <div className="text-[10px]" style={{ color: '#94a3b8' }}>
                                    {sg.suggestedShares}주
                                    {sg.priceKRW ? ` · ${fmtAmt(sg.priceKRW)}/주` : sg.priceUSD ? ` · $${sg.priceUSD.toFixed(0)}/주` : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* 살 수 없는 종목 */}
                      {beginnerResult.unaffordable.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="text-[10px] font-bold px-1" style={{ color: '#ef4444' }}>예산 부족 종목</div>
                          {beginnerResult.unaffordable.map((sg) => (
                            <div key={sg.ticker} className="flex items-center justify-between rounded-xl px-3 py-2 opacity-60" style={{ background: 'rgba(239,68,68,0.07)', border: '1px dashed #ef444440' }}>
                              <div>
                                <span className="font-black text-xs" style={{ color: '#1c1c1e' }}>{sg.ticker}</span>
                                <span className="ml-1.5 text-[11px]" style={{ color: '#64748b' }}>{sg.name}</span>
                              </div>
                              <div className="text-[10px]" style={{ color: '#ef4444' }}>
                                {sg.priceKRW ? fmtAmt(sg.priceKRW) : sg.priceUSD ? `$${sg.priceUSD.toFixed(0)}` : ''}/주
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* 경고 */}
                      {beginnerResult.warnings.length > 0 && (
                        <div className="mt-2 rounded-xl px-3 py-2" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                          {beginnerResult.warnings.map((w, i) => (
                            <div key={i} className="text-[11px]" style={{ color: '#92400e' }}>⚠ {w}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 포트폴리오 이름 */}
                <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>포트폴리오 이름</label>
                  <input
                    value={portfolioName}
                    onChange={(e) => setPortfolioName(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-[#1c1c1e] text-sm font-semibold outline-none transition-all"
                    style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4' }}
                    onFocus={(e) => (e.target.style.borderColor = accent.hex)}
                    onBlur={(e) => (e.target.style.borderColor = '#e8ecf4')}
                  />
                </div>

                {/* 종목 검색 */}
                <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>종목 검색</label>
                  <div className="flex gap-2">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="flex-1 rounded-xl px-4 py-3 text-[#1c1c1e] text-sm outline-none transition-all"
                      style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4' }}
                      onFocus={(e) => (e.target.style.borderColor = accent.hex)}
                      onBlur={(e) => (e.target.style.borderColor = '#e8ecf4')}
                      placeholder="AAPL · 애플 · Apple · 삼성..."
                    />
                    {(search || searchResults.length > 0) && (
                      <button
                        onClick={() => { setSearch(''); setSearchResults([]); setSearchDone(false); }}
                        className="rounded-xl px-3 py-3 text-sm font-bold transition-all"
                        style={{ background: '#f1f5f9', color: '#64748b' }}
                        title="검색 취소"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      onClick={handleSearch}
                      disabled={loadingSearch}
                      className="rounded-xl px-5 py-3 text-sm font-bold text-[#1c1c1e] disabled:opacity-50 transition-all"
                      style={{ background: accent.hex, color: 'white' }}
                    >
                      {loadingSearch ? '...' : '검색'}
                    </button>
                  </div>

                  {searchDone && searchResults.length === 0 && !loadingSearch && (
                    <div className="mt-3 rounded-xl px-4 py-4 text-center" style={{ border: '1px solid #e8ecf4', background: '#f8fafc' }}>
                      <p className="text-sm font-semibold text-[#1c1c1e] mb-0.5">검색 결과가 없어요</p>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>DB와 Yahoo Finance 모두에서 찾지 못했어요<br/>영문 티커(예: PL · BYND)나 영문 회사명으로 검색해보세요</p>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid #e8ecf4' }}>
                      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#f8fafc' }}>
                        <span className="text-xs" style={{ color: '#94a3b8' }}>검색결과 {searchResults.length}개</span>
                        <button onClick={() => { setSearchResults([]); setSearch(''); }} className="text-xs px-2 py-0.5 rounded-lg transition-all" style={{ color: '#64748b', background: '#f1f5f9' }}>취소</button>
                      </div>
                      {searchResults.map((s) => (
                        <button key={s.id} onClick={() => addItem(s)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left transition-all"
                          style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = accent.light)}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                        >
                          <div>
                            <span className="font-bold text-[#1c1c1e] text-sm">{s.displayNameKo ?? s.name}</span>
                            <span className="text-xs ml-2" style={{ color: '#94a3b8' }}>{s.ticker}</span>
                          </div>
                          {s.sector && s.sector !== 'N/A' && (
                            <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: '#f1f5f9', color: '#94a3b8' }}>{sectorLabel(s.sector)}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 포트폴리오 구성 */}
                {items.length > 0 && (
                  <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
                        보유 종목 ({items.length})
                      </label>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold" style={{ color: inputMode === 'amount' ? (totalAmount > 0 ? '#10b981' : '#4b5563') : (Math.round(totalWeight) === 100 ? '#10b981' : '#f59e0b') }}>
                          {inputMode === 'amount' ? `₩${formatAmount(totalAmount) || '0'}` : `${totalWeight.toFixed(1)}%`}
                        </span>
                        <div className="flex rounded-lg overflow-hidden text-xs" style={{ border: '1px solid #e8ecf4' }}>
                          {(['amount', 'weight'] as const).map((m) => (
                            <button key={m} onClick={() => setInputMode(m)}
                              className="px-3 py-1.5 font-semibold transition-all"
                              style={{ background: inputMode === m ? accent.hex : 'transparent', color: inputMode === m ? 'white' : '#6b7280' }}
                            >
                              {m === 'amount' ? '금액' : '비중'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item.securityId} className="rounded-xl px-4 py-3 space-y-2.5" style={{ background: '#f8fafc', border: '1px solid #e8ecf4' }}>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-[#1c1c1e] text-sm">{item.displayNameKo ?? item.name}</span>
                              <span className="text-xs ml-2" style={{ color: '#94a3b8' }}>{item.ticker}</span>
                            </div>
                            <button onClick={() => removeItem(item.securityId)} style={{ color: '#cbd5e1' }}
                              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
                              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#374151')}
                            >
                              <IconX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            {inputMode === 'amount' ? (
                              <>
                                {isUS(item.ticker) ? (
                                  <div className="flex-1 flex items-center rounded-lg" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                    <span className="pl-3 text-sm shrink-0" style={{ color: '#94a3b8' }}>$</span>
                                    <input type="text" inputMode="decimal"
                                      value={item.amount > 0 ? item.amount.toString() : ''}
                                      onChange={(e) => { const raw = e.target.value.replace(/[^0-9.]/g, ''); updateAmount(item.securityId, raw ? Number(raw) : 0); }}
                                      className="flex-1 rounded-lg px-2 py-1.5 text-right text-[#1c1c1e] text-sm outline-none tabular-nums"
                                      style={{ background: 'transparent' }}
                                      placeholder="0.00"
                                      onFocus={(e) => { if (e.target.parentElement) e.target.parentElement.style.borderColor = accent.hex; }}
                                      onBlur={(e) => { if (e.target.parentElement) e.target.parentElement.style.borderColor = '#e8ecf4'; }}
                                    />
                                  </div>
                                ) : (
                                  <input type="text" inputMode="numeric"
                                    value={item.amount > 0 ? item.amount.toLocaleString('ko-KR') : ''}
                                    onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ''); updateAmount(item.securityId, raw ? Number(raw) : 0); }}
                                    className="flex-1 rounded-lg px-3 py-1.5 text-right text-[#1c1c1e] text-sm outline-none tabular-nums"
                                    style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                                    placeholder="0"
                                    onFocus={(e) => (e.target.style.borderColor = accent.hex)}
                                    onBlur={(e) => (e.target.style.borderColor = '#e8ecf4')}
                                  />
                                )}
                                <span className="text-xs w-12 text-right shrink-0" style={{ color: '#94a3b8' }}>{getItemWeight(item).toFixed(1)}%</span>
                              </>
                            ) : (
                              <>
                                <input type="number" min={0} max={100}
                                  value={item.weight || ''}
                                  onChange={(e) => updateWeight(item.securityId, Number(e.target.value))}
                                  className="w-20 rounded-lg px-2 py-1.5 text-center text-[#1c1c1e] text-sm outline-none"
                                  style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                                  placeholder="0"
                                />
                                <span className="text-sm shrink-0" style={{ color: '#94a3b8' }}>%</span>
                              </>
                            )}
                            <input type="text" inputMode={isUS(item.ticker) ? 'decimal' : 'numeric'}
                              value={item.avgCost > 0 ? (isUS(item.ticker) ? item.avgCost.toString() : item.avgCost.toLocaleString('ko-KR')) : ''}
                              onChange={(e) => { const raw = isUS(item.ticker) ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value.replace(/[^0-9]/g, ''); updateAvgCost(item.securityId, raw ? Number(raw) : 0); }}
                              className="w-24 rounded-lg px-2 py-1.5 text-right text-sm outline-none tabular-nums"
                              style={{ background: '#ffffff', border: '1px solid #e8ecf4', color: '#94a3b8' }}
                              placeholder={isUS(item.ticker) ? '평단가($)' : '평단가'}
                              onFocus={(e) => (e.target.style.borderColor = accent.hex)}
                              onBlur={(e) => (e.target.style.borderColor = '#e8ecf4')}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {items.length === 0 && (
                  <div className="rounded-2xl flex flex-col items-center justify-center py-16 text-center" style={{ background: '#ffffff', border: '1.5px dashed #cbd5e1' }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: accent.light }}>
                      <IconPieChart className="w-7 h-7" style={{ color: accent.hex }} />
                    </div>
                    <p className="text-sm font-semibold text-[#1c1c1e] mb-1">종목을 추가해보세요</p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>위에서 검색해서 포트폴리오를 구성하세요</p>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                    <IconWarning className="w-4 h-4 shrink-0" />{error}
                  </div>
                )}

                <button onClick={handleAnalyze} disabled={loadingAnalyze || items.length === 0}
                  className="w-full rounded-2xl py-4 text-base font-black disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                  style={{ background: accent.hex, color: 'white' }}
                >
                  {loadingAnalyze ? '분석 중...' : (<>포트폴리오 분석하기 <IconArrowRight className="w-4 h-4" /></>)}
                </button>
              </div>
            )}

            {/* ── 분석 대시보드 탭 ── */}
            {activeTab === 'result' && analysis && (() => {
              const risk = riskLabel(analysis.healthScore);
              const isPremium = analysis.isPremium ?? false;
              const top3Actions = analysis.rebalanceResult?.actions?.slice(0, 3) ?? [];
              const scoreDelta = analysis.rebalanceResult ? analysis.rebalanceResult.improvedScore - analysis.rebalanceResult.currentScore : 0;
              const conclusion = analysis.rebalanceResult?.summary ?? (analysis.healthScore >= 80 ? '포트폴리오가 잘 분산되어 있습니다.' : '포트폴리오 개선이 필요합니다.');

              const portfolioEvents = notifications.filter((n) => n.portfolioId === analysis.portfolioId).slice(0, 5);

              return (
                <div className="space-y-5">

                  {/* ── 최근 변화 알림 ── */}
                  {portfolioEvents.length > 0 && (
                    <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>최근 변화</div>
                      <div className="space-y-2.5">
                        {portfolioEvents.map((evt) => {
                          const iconMap: Record<string, string> = {
                            SCORE_DROP: '📉', DIVERSIFICATION_DROP: '⚠️', OVERWEIGHT_ENTERED: '⚡',
                            SECTOR_BIAS_ENTERED: '🔶', TOP3_CONCENTRATION_ENTERED: '🎯',
                            REBALANCE_NEEDED: '🔧', OPPORTUNITY_AVAILABLE: '✨',
                          };
                          const colMap: Record<string, string> = {
                            critical: '#ef4444', warning: '#f59e0b', opportunity: '#10b981', info: '#6b7280',
                          };
                          const col = colMap[evt.severity] ?? '#6b7280';
                          return (
                            <div
                              key={evt.id}
                              className="flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all"
                              style={{ background: evt.isRead ? '#f8fafc' : `${col}08`, border: `1px solid ${evt.isRead ? '#f1f5f9' : col + '30'}` }}
                              onClick={async () => {
                                if (!evt.isRead) {
                                  await markEventRead(evt.id).catch(() => {});
                                  setNotifications((prev) => prev.map((e) => e.id === evt.id ? { ...e, isRead: true } : e));
                                }
                              }}
                            >
                              <span className="text-base shrink-0 mt-0.5">{iconMap[evt.eventType] ?? '🔔'}</span>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-[#1c1c1e] leading-snug">{evt.title}</div>
                                <div className="text-xs mt-0.5 leading-relaxed" style={{ color: '#64748b' }}>{evt.message}</div>
                              </div>
                              {!evt.isRead && <div className="w-2 h-2 rounded-full shrink-0 mt-1.5 ml-auto" style={{ background: col }} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Row 1: Health Score + Asset Allocation ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* Health Score 카드 */}
                    <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Health Score</div>
                          <div className="text-sm font-bold" style={{ color: risk.color }}>{risk.text}</div>
                        </div>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accent.light }}>
                          <IconShield className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: accent.hex }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-6 mb-5">
                        <ScoreRing score={analysis.healthScore} size={110} />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm text-[#1c1c1e] leading-snug font-medium">{conclusion}</p>
                          {analysis.history?.alerts?.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <IconWarning className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                              <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>경고 {analysis.history.alerts.length}개</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 스타일 + 분산도 */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl p-3" style={{ background: '#f8fafc' }}>
                          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>투자 스타일</div>
                          <div className="text-sm font-bold text-[#1c1c1e]">{analysis.portfolioStyle}</div>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: '#f8fafc' }}>
                          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>분산도</div>
                          <div className="text-sm font-bold" style={{ color: '#10b981' }}>{analysis.diversificationScore}</div>
                          {analysis.diversificationPercentile > 0 && (
                            <div className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
                              전체 유저 상위 {100 - analysis.diversificationPercentile}%
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Asset Allocation 카드 */}
                    <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Asset Allocation</div>
                          <div className="text-sm font-bold text-[#1c1c1e]">섹터별 분산 현황</div>
                        </div>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
                          <IconPieChart className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: '#10b981' }} />
                        </div>
                      </div>

                      <div className="space-y-3">
                        {analysis.sectorExposure.slice(0, 6).map((s, i) => (
                          <div key={s.sector}>
                            <div className="flex justify-between text-sm mb-1.5">
                              <span className="font-medium" style={{ color: '#374151' }}>{sectorLabel(s.sector)}</span>
                              <span className="font-bold" style={{ color: SECTOR_COLORS[i % SECTOR_COLORS.length] }}>{Number(s.weight).toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 rounded-full" style={{ background: '#f1f5f9' }}>
                              <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(s.weight, 100)}%`, background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── 지금 뭘 해야 하나요? ── */}
                  {(() => {
                    const score = analysis.healthScore;
                    const timing = score >= 80
                      ? { days: 14, range: '7~14일', reason: '포트폴리오가 안정적이에요. 주 1회 확인으로 충분합니다.', color: '#10b981' }
                      : score >= 60
                      ? { days: 5, range: '3~7일', reason: '일부 위험 요소가 있어요. 며칠 안에 다시 확인해 보세요.', color: '#f59e0b' }
                      : { days: 1, range: '지금 바로', reason: '위험 수준이 높아요. 지금 바로 조치가 필요합니다.', color: '#ef4444' };

                    const failedRules = analysis.scoreBreakdown.filter((r: ScoreRule) => !r.passed);
                    const primaryAction = failedRules.length === 0
                      ? '지금 구성을 유지하세요.'
                      : failedRules.reduce((a: ScoreRule, b: ScoreRule) => Math.abs(a.delta) >= Math.abs(b.delta) ? a : b).action;
                    const status = score >= 80
                      ? { emoji: '✓', label: '잘 관리되고 있어요', color: '#10b981', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)' }
                      : score >= 60
                      ? { emoji: '!', label: '확인 포인트가 있어요', color: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)' }
                      : { emoji: '⚡', label: '조치가 필요해요', color: '#ef4444', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.2)' };
                    return (
                      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${status.border}` }}>
                        <div className="px-5 py-4 flex items-center gap-4" style={{ background: status.bg }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black shrink-0" style={{ background: status.border, color: status.color }}>
                            {status.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: status.color }}>지금 뭘 해야 하나요?</div>
                            <div className="text-sm font-semibold text-[#1c1c1e] leading-snug">{primaryAction}</div>
                          </div>
                          {failedRules.length > 0 && (
                            <div className="shrink-0 text-right">
                              <div className="text-[10px]" style={{ color: '#94a3b8' }}>개선 포인트</div>
                              <div className="text-xl font-black" style={{ color: status.color }}>{failedRules.length}개</div>
                            </div>
                          )}
                        </div>
                        <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#f8fafc', borderTop: `1px solid ${status.border}` }}>
                          <span className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{timing.reason}</span>
                          <div className="shrink-0 ml-3 text-right">
                            <div className="text-[10px]" style={{ color: '#9ca3af' }}>다음 점검</div>
                            <div className="text-xs font-black" style={{ color: timing.color }}>{timing.range}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── 리밸런싱 완료 피드백 ── */}
                  {prevAnalysis && rebalanceAppliedAt && (() => {
                    const score = analysis.healthScore;
                    const timing = score >= 80
                      ? { days: 14, range: '7~14일 후', label: '포트폴리오가 안정적이에요', color: '#10b981' }
                      : score >= 60
                      ? { days: 5, range: '3~7일 후', label: '조만간 다시 확인하세요', color: '#f59e0b' }
                      : { days: 1, range: '지금 바로', label: '추가 조치가 필요해요', color: '#ef4444' };
                    const nextDate = new Date(rebalanceAppliedAt);
                    nextDate.setDate(nextDate.getDate() + timing.days);
                    const nextDateStr = nextDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
                    return (
                      <div className="rounded-2xl p-5" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>✓</div>
                          <span className="text-sm font-bold text-[#1c1c1e]">리밸런싱이 완료됐어요!</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          {[
                            { label: '건강 점수', before: prevAnalysis.healthScore, after: analysis.healthScore, unit: '점', higherIsBetter: true },
                            { label: '분산도', before: prevAnalysis.diversificationScore, after: analysis.diversificationScore, unit: '점', higherIsBetter: true },
                            { label: '집중도', before: prevAnalysis.top3Concentration, after: analysis.top3Concentration, unit: '%', higherIsBetter: false },
                          ].map(({ label, before, after, unit, higherIsBetter }) => {
                            const delta = Number((after - before).toFixed(1));
                            const improved = higherIsBetter ? delta > 0 : delta < 0;
                            const neutral = delta === 0;
                            const color = neutral ? '#9ca3af' : improved ? '#10b981' : '#ef4444';
                            const sign = delta > 0 ? '+' : '';
                            return (
                              <div key={label} className="rounded-xl p-3 text-center" style={{ background: '#f8fafc' }}>
                                <div className="text-[10px] mb-1.5" style={{ color: '#94a3b8' }}>{label}</div>
                                <div className="text-xs font-medium" style={{ color: '#64748b' }}>{Math.round(before)}{unit}</div>
                                <div className="text-xs my-0.5" style={{ color: '#cbd5e1' }}>↓</div>
                                <div className="text-base font-black" style={{ color }}>{Math.round(after)}{unit}</div>
                                {!neutral && <div className="text-[10px] font-bold mt-0.5" style={{ color }}>{sign}{delta}{unit}</div>}
                              </div>
                            );
                          })}
                        </div>
                        <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: `${timing.color}10`, border: `1px solid ${timing.color}30` }}>
                          <div>
                            <div className="text-xs font-semibold" style={{ color: timing.color }}>{timing.label}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>다음 점검 추천: {nextDateStr} ({timing.range})</div>
                          </div>
                          <div className="text-lg font-black" style={{ color: timing.color }}>📅</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── 경고 알림 ── */}
                  {analysis.history?.alerts?.length > 0 && (
                    <div className="space-y-2">
                      {analysis.history.alerts.map((alert: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <IconWarning className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                          <span className="text-sm leading-relaxed" style={{ color: '#b45309' }}>{alert}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Row 2: 내 종목 차트 & 재무지표 ── */}
                  {items.length > 0 && (
                    <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>Holdings</div>
                        <div className="text-sm font-bold text-[#1c1c1e]">내 종목 차트 & 재무지표</div>
                      </div>
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {items.map((item) => {
                          const sectorExp = analysis.sectorExposure.find((s) => s.sector !== 'Cash' && s.sector !== 'ETF');
                          const rebalAction = analysis.rebalanceResult?.actions?.find(
                            (a) => a.ticker === item.ticker && a.ticker !== '_sector_div'
                          );
                          return (
                            <button
                              key={item.ticker}
                              onClick={() => setTickerModal({ ticker: item.ticker, displayName: item.displayNameKo ?? item.name ?? item.ticker, rebalanceAction: rebalAction })}
                              className="rounded-xl p-3 text-left flex flex-col gap-1.5 transition-all hover:shadow-md hover:-translate-y-0.5"
                              style={{
                                background: rebalAction?.type === 'reduce' ? 'rgba(239,68,68,0.05)' : rebalAction?.type === 'add' ? 'rgba(16,185,129,0.05)' : '#f8fafc',
                                border: `1.5px solid ${rebalAction?.type === 'reduce' ? 'rgba(239,68,68,0.2)' : rebalAction?.type === 'add' ? 'rgba(16,185,129,0.2)' : '#e8ecf4'}`,
                              }}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="text-xs font-black" style={{ color: '#1c1c1e' }}>{item.ticker}</span>
                                {rebalAction && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{
                                    background: rebalAction.type === 'reduce' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                                    color: rebalAction.type === 'reduce' ? '#ef4444' : '#10b981',
                                  }}>
                                    {rebalAction.type === 'reduce' ? '↓ 축소' : '↑ 확대'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] leading-tight truncate" style={{ color: '#6b7280' }}>{item.displayNameKo ?? item.name ?? ''}</span>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="text-[10px] font-bold tabular-nums" style={{ color: accent.hex }}>{Number(item.weight).toFixed(1)}%</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10, color: '#cbd5e1' }}>
                                  <path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Row 3: 리밸런싱 + 포트폴리오 미리보기 ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* 리밸런싱 가이드 (2/3) */}
                    {analysis.rebalanceResult && (
                      <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        {/* 헤더 */}
                        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: accent.light }}>
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>Rebalancing Strategy</div>
                            {scoreDelta > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#1c1c1e] text-sm">리밸런싱 후 분산도</span>
                                <span className="font-black" style={{ color: '#64748b' }}>{analysis.rebalanceResult.currentScore}</span>
                                <span style={{ color: '#94a3b8' }}>→</span>
                                <span className="font-black" style={{ color: '#10b981' }}>{analysis.rebalanceResult.improvedScore}</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>+{scoreDelta}점</span>
                              </div>
                            ) : (
                              <div className="text-sm font-bold" style={{ color: '#10b981' }}>포트폴리오가 이미 최적화되어 있습니다</div>
                            )}
                          </div>
                        </div>

                        {/* 처음 대비 변화 (페이월 바깥, baseline이 있을 때만) */}
                        {(analysis.rebalanceResult?.baselineDrift?.length ?? 0) > 0 && (
                          <div className="px-5 pt-4 pb-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            <div className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#94a3b8' }}>처음 대비 변화</div>
                            <div className="space-y-1.5">
                              {(analysis.rebalanceResult!.baselineDrift as BaselineDrift[]).slice(0, 5).map((d) => {
                                const isUp = d.delta > 0;
                                const isNew = d.status === 'added';
                                const isRemoved = d.status === 'removed';
                                return (
                                  <div key={d.ticker} onClick={() => setTickerModal({ ticker: d.ticker, displayName: d.label, drift: d })} className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity" style={{
                                    background: isNew ? 'rgba(16,185,129,0.06)' : isRemoved ? 'rgba(239,68,68,0.06)' : 'rgba(0,0,0,0.03)',
                                    border: `1px solid ${isNew ? 'rgba(16,185,129,0.15)' : isRemoved ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.06)'}`,
                                  }}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold" style={{ color: '#374151' }}>{d.label}</span>
                                      {isNew && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>신규</span>}
                                      {isRemoved && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>제거됨</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs tabular-nums">
                                      {!isNew && !isRemoved && (
                                        <span style={{ color: '#9ca3af' }}>{d.baselineWeight}%</span>
                                      )}
                                      {!isNew && !isRemoved && <span style={{ color: '#cbd5e1' }}>→</span>}
                                      <span className="font-bold" style={{ color: isNew ? '#10b981' : isRemoved ? '#ef4444' : isUp ? '#10b981' : '#ef4444' }}>
                                        {isRemoved ? `−${d.baselineWeight}%` : `${d.currentWeight}%`}
                                      </span>
                                      {!isNew && !isRemoved && (
                                        <span className="font-bold text-[10px]" style={{ color: isUp ? '#10b981' : '#ef4444' }}>
                                          {isUp ? `+${d.delta}` : `${d.delta}`}%p
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 콘텐츠 + 페이월 */}
                        <div className="relative">
                          <div className={`p-5 space-y-3${!isPremium ? ' blur-[3px] select-none pointer-events-none' : ''}`}>
                            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>Recommended Actions</div>
                            {top3Actions.map((action: RebalanceAction, i: number) => (
                              <div key={action.ticker} onClick={() => action.ticker !== '_sector_div' && setTickerModal({ ticker: action.ticker, displayName: action.label, rebalanceAction: action })}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-opacity${action.ticker !== '_sector_div' ? ' cursor-pointer hover:opacity-75' : ''}`} style={{
                                background: action.type === 'reduce' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                                border: `1px solid ${action.type === 'reduce' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                              }}>
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{
                                  background: action.type === 'reduce' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                                  color: action.type === 'reduce' ? '#f87171' : '#34d399',
                                }}>{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm" style={{ color: "#1c1c1e" }}>{action.text}</span>
                                  {(() => {
                                    const q = action.ticker !== '_sector_div' ? tickerQuotes[action.ticker] : undefined;
                                    if (!q) return null;
                                    const tags = buildRiskTags(q, action.type as 'reduce' | 'add');
                                    const explanation = buildRiskExplanation(q, action.type as 'reduce' | 'add');
                                    if (!tags.length) return null;
                                    return (
                                      <div className="mt-1.5">
                                        <div className="flex flex-wrap gap-1 mb-1">
                                          {tags.map((tag, ti) => (
                                            <span key={ti} className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{
                                              background: tag.level === 'high' ? 'rgba(239,68,68,0.12)' : tag.level === 'positive' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                              color: tag.level === 'high' ? '#ef4444' : tag.level === 'positive' ? '#10b981' : '#f59e0b',
                                            }}>{tag.text}</span>
                                          ))}
                                        </div>
                                        <p className="text-[11px] leading-snug" style={{ color: '#64748b' }}>{explanation}</p>
                                      </div>
                                    );
                                  })()}
                                </div>
                                {action.ticker !== '_sector_div' && (
                                  <span className="font-black text-lg shrink-0" style={{ color: action.type === 'reduce' ? '#ef4444' : '#10b981' }}>
                                    {action.type === 'reduce' ? '↓' : '↑'}
                                  </span>
                                )}
                              </div>
                            ))}
                            {scoreDelta > 0 && (
                              <div className="rounded-xl p-4 mt-2" style={{ background: '#f8fafc', border: '1px solid #e8ecf4' }}>
                                <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>Before / After 시뮬레이션</div>
                                <div className="grid grid-cols-3 items-center gap-2 mb-3">
                                  <div className="text-center">
                                    <div className="text-[10px] mb-1" style={{ color: '#94a3b8' }}>지금</div>
                                    <div className="text-3xl font-black" style={{ color: divScoreLabel(analysis.rebalanceResult.currentScore).color }}>{analysis.rebalanceResult.currentScore}</div>
                                    <div className="text-xs font-bold mt-0.5" style={{ color: divScoreLabel(analysis.rebalanceResult.currentScore).color }}>{divScoreLabel(analysis.rebalanceResult.currentScore).text}</div>
                                  </div>
                                  <div className="text-center text-xl" style={{ color: '#94a3b8' }}>→</div>
                                  <div className="text-center">
                                    <div className="text-[10px] mb-1" style={{ color: '#94a3b8' }}>리밸런싱 후</div>
                                    <div className="text-3xl font-black" style={{ color: divScoreLabel(analysis.rebalanceResult.improvedScore).color }}>{analysis.rebalanceResult.improvedScore}</div>
                                    <div className="text-xs font-bold mt-0.5" style={{ color: divScoreLabel(analysis.rebalanceResult.improvedScore).color }}>{divScoreLabel(analysis.rebalanceResult.improvedScore).text}</div>
                                  </div>
                                </div>
                                <div className="text-xs text-center leading-relaxed" style={{ color: '#94a3b8' }}>{analysis.rebalanceResult.whyItMatters}</div>
                              </div>
                            )}
                          </div>

                          {!isPremium && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-b-2xl" style={{ background: 'rgba(20,20,24,0.85)', backdropFilter: 'blur(2px)' }}>
                              <div className="text-center px-6">
                                {scoreDelta > 0 && (
                                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                                    <span className="text-xs font-bold" style={{ color: '#10b981' }}>분산도 +{scoreDelta}점 개선 가능</span>
                                  </div>
                                )}
                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: accent.light, border: `1px solid ${accent.hex}40` }}>
                                  <IconLock className="w-5 h-5" style={{ color: accent.hex }} />
                                </div>
                                <div className="text-[#1c1c1e] font-bold text-sm mb-1">리밸런싱 가이드 잠금</div>
                                <div className="text-xs mb-4 leading-relaxed" style={{ color: '#94a3b8' }}>구체적 비율 · Before/After 시뮬레이션<br />미래 리스크 분석 포함</div>
                                <button onClick={handleCheckout} disabled={checkoutLoading}
                                  className="w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-60 transition-all"
                                  style={{ background: accent.hex, color: 'white' }}
                                >
                                  {checkoutLoading ? '이동 중...' : '프리미엄으로 보기 — ₩2,900'}
                                </button>
                                <div className="text-[10px] mt-2" style={{ color: '#cbd5e1' }}>단건 결제 · 구독 아님</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 투자금액 조정 시뮬레이터 */}
                    {totalAmount > 0 && (analysis.rebalanceResult?.suggestedPortfolio?.length ?? 0) > 0 && (() => {
                      const adjustAmt = Number(adjustInput.replace(/,/g, '')) || 0;
                      const newTotal = adjustType === 'add' ? totalAmount + adjustAmt : Math.max(0, totalAmount - adjustAmt);
                      const suggested = analysis.rebalanceResult!.suggestedPortfolio;
                      const rows = suggested.map((s) => {
                        const existing = items.find((i) => i.ticker === s.ticker);
                        const currentKRW = existing ? toKRW(existing) : 0;
                        const targetKRW = Math.round((s.weight / 100) * newTotal);
                        const deltaKRW = targetKRW - currentKRW;
                        const name = existing?.displayNameKo ?? existing?.name ?? tickerNameMap[s.ticker] ?? s.ticker;
                        return { ticker: s.ticker, name, currentKRW, targetKRW, deltaKRW };
                      });
                      const fmtKRW = (n: number) => {
                        const abs = Math.abs(n);
                        if (abs >= 1e8) return `${(n / 1e8).toFixed(1)}억`;
                        if (abs >= 1e4) return `${Math.round(n / 1e4)}만`;
                        return `${n.toLocaleString()}`;
                      };
                      return (
                        <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>투자금액 조정 시뮬레이터</div>
                          <div className="text-sm font-bold text-[#1c1c1e] mb-4">추가 투자 또는 인출 시 어떻게 달라지나요?</div>

                          {/* 타입 + 금액 입력 */}
                          <div className="flex gap-2 mb-4">
                            <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid #e8ecf4' }}>
                              {(['add', 'withdraw'] as const).map((t) => (
                                <button key={t} onClick={() => setAdjustType(t)}
                                  className="px-4 py-2.5 text-xs font-bold transition-all"
                                  style={{ background: adjustType === t ? accent.hex : '#f8fafc', color: adjustType === t ? 'white' : '#64748b' }}
                                >{t === 'add' ? '➕ 추가 투자' : '➖ 인출'}</button>
                              ))}
                            </div>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={adjustInput}
                              onChange={(e) => setAdjustInput(e.target.value.replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
                              placeholder="금액 입력 (원)"
                              className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                              style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4' }}
                              onFocus={(e) => (e.target.style.borderColor = accent.hex)}
                              onBlur={(e) => (e.target.style.borderColor = '#e8ecf4')}
                            />
                          </div>

                          {/* 현재 vs 조정 후 총액 */}
                          <div className="flex items-center gap-3 mb-4 rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid #e8ecf4' }}>
                            <div className="flex-1 text-center">
                              <div className="text-[10px] font-semibold mb-0.5" style={{ color: '#94a3b8' }}>현재 총액</div>
                              <div className="text-base font-black" style={{ color: '#1c1c1e' }}>{fmtKRW(totalAmount)}원</div>
                            </div>
                            <div className="text-lg" style={{ color: '#94a3b8' }}>→</div>
                            <div className="flex-1 text-center">
                              <div className="text-[10px] font-semibold mb-0.5" style={{ color: '#94a3b8' }}>조정 후 총액</div>
                              <div className="text-base font-black" style={{ color: adjustAmt > 0 ? (adjustType === 'add' ? '#10b981' : '#ef4444') : '#1c1c1e' }}>
                                {fmtKRW(newTotal)}원
                              </div>
                            </div>
                            {adjustAmt > 0 && (
                              <div className="flex-1 text-center">
                                <div className="text-[10px] font-semibold mb-0.5" style={{ color: '#94a3b8' }}>변화</div>
                                <div className="text-sm font-black" style={{ color: adjustType === 'add' ? '#10b981' : '#ef4444' }}>
                                  {adjustType === 'add' ? '+' : '-'}{fmtKRW(adjustAmt)}원
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 종목별 조정 테이블 */}
                          {adjustAmt > 0 && (
                            <div className="space-y-2">
                              <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>종목별 필요 액션 (추천 비중 기준)</div>
                              {rows.map((row) => (
                                <div key={row.ticker} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                                  style={{ background: row.deltaKRW > 1000 ? 'rgba(16,185,129,0.06)' : row.deltaKRW < -1000 ? 'rgba(239,68,68,0.06)' : '#f8fafc', border: `1px solid ${row.deltaKRW > 1000 ? 'rgba(16,185,129,0.2)' : row.deltaKRW < -1000 ? 'rgba(239,68,68,0.2)' : '#e8ecf4'}` }}>
                                  <div className="shrink-0 min-w-0" style={{ maxWidth: '40%' }}>
                                    <div className="font-bold text-xs truncate" style={{ color: '#1c1c1e' }}>{row.name}</div>
                                    <div className="text-[10px]" style={{ color: '#94a3b8' }}>{row.ticker}</div>
                                  </div>
                                  <div className="flex-1 text-xs tabular-nums" style={{ color: '#64748b' }}>
                                    {fmtKRW(row.currentKRW)}원 → {fmtKRW(row.targetKRW)}원
                                  </div>
                                  <div className="shrink-0 text-xs font-bold tabular-nums" style={{ color: row.deltaKRW > 1000 ? '#10b981' : row.deltaKRW < -1000 ? '#ef4444' : '#94a3b8' }}>
                                    {row.deltaKRW > 1000 ? `+${fmtKRW(row.deltaKRW)}원 매수` : row.deltaKRW < -1000 ? `${fmtKRW(row.deltaKRW)}원 매도` : '유지'}
                                  </div>
                                </div>
                              ))}
                              <p className="text-[10px] mt-2 mb-3 leading-relaxed" style={{ color: '#94a3b8' }}>
                                * 추천 비중을 기준으로 계산한 참고값입니다. 실제 매매 단가와 다를 수 있어요.
                              </p>
                              <button
                                onClick={handleApplyAdjustment}
                                disabled={applyingAdjustment}
                                className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 transition-all"
                                style={{ background: adjustType === 'add' ? '#10b981' : '#ef4444' }}
                              >
                                {applyingAdjustment ? '적용 중...' : adjustType === 'add' ? `+${fmtKRW(adjustAmt)}원 추가 투자 반영하기` : `-${fmtKRW(adjustAmt)}원 인출 반영하기`}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 포트폴리오 미리보기 (1/3) */}
                    <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>Portfolio Preview</div>
                        <div className="text-sm font-bold text-[#1c1c1e]">변경 후 비중</div>
                      </div>

                      {/* 환율 표시 + 직접 입력 */}
                      {usdKrw && (
                        <div className="rounded-xl px-3 py-2.5" style={{ background: '#f8fafc', border: '1px solid #e8ecf4' }}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>미국주식 환율 기준</span>
                            <span className="text-[10px]" style={{ color: '#cbd5e1' }}>매매기준율 {usdKrw.midRate.toLocaleString()}원</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: '#64748b' }}>$1 =</span>
                            <input
                              type="number"
                              value={customUsdKrw || usdKrw.rate}
                              onChange={(e) => setCustomUsdKrw(e.target.value)}
                              className="flex-1 rounded-lg px-2 py-1 text-sm text-[#1c1c1e] text-right outline-none tabular-nums"
                              style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                              onFocus={(e) => (e.target.style.borderColor = accent.hex)}
                              onBlur={(e) => (e.target.style.borderColor = '#e8ecf4')}
                            />
                            <span className="text-xs shrink-0" style={{ color: '#64748b' }}>원</span>
                          </div>
                          <div className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>우대 환율 받으셨다면 직접 입력하세요</div>
                        </div>
                      )}

                      {analysis.rebalanceResult?.suggestedPortfolio?.length ? (
                        <div className="space-y-2 flex-1">
                          {analysis.rebalanceResult.suggestedPortfolio.map((s) => {
                            const current = items.find((i) => i.ticker === s.ticker);
                            const currentW = current?.weight ?? 0;
                            const delta = s.weight - currentW;
                            const isNew = s.isNew;
                            const displayName = current?.displayNameKo ?? current?.name ?? s.ticker;
                            return (
                              <div key={s.ticker}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold" style={{ color: '#374151' }}>{displayName}</span>
                                    {isNew && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>NEW</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {!isNew && <span className="text-[10px]" style={{ color: '#94a3b8' }}>{currentW}% →</span>}
                                    <span className="text-xs font-black" style={{ color: delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#9ca3af' }}>{s.weight}%</span>
                                    {delta !== 0 && <span className="text-[10px] font-bold" style={{ color: delta > 0 ? '#10b981' : '#ef4444' }}>{delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}</span>}
                                  </div>
                                </div>
                                <div className="h-1.5 rounded-full" style={{ background: '#f1f5f9' }}>
                                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${s.weight}%`, background: isNew ? '#10b981' : delta < 0 ? '#f59e0b' : accent.hex }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs" style={{ color: '#94a3b8' }}>현재 포트폴리오가 이미 잘 분산되어 있어요</div>
                      )}

                      {(analysis.rebalanceResult?.actions?.length ?? 0) > 0 && (
                        isPremium ? (
                          <button
                            onClick={handleApplyRebalance}
                            disabled={applyingRebalance}
                            className="w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 transition-all"
                            style={{ background: accent.hex, color: 'white' }}
                          >
                            {applyingRebalance ? '적용 중...' : '이 비율로 포트폴리오 재설정'}
                          </button>
                        ) : (
                          <button
                            onClick={handleCheckout}
                            className="w-full rounded-xl py-2.5 text-sm font-bold transition-all"
                            style={{ background: accent.hex + '50', border: `1px solid ${accent.hex}60`, color: 'white' }}
                          >
                            🔒 프리미엄으로 재설정하기
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* ── 다음 할 일 ── */}
                  {(() => {
                    const failedRules = analysis.scoreBreakdown.filter((r: ScoreRule) => !r.passed);
                    const topSector = analysis.sectorExposure.filter(s => s.sector !== 'Cash' && s.sector !== 'ETF')[0];
                    const nextCheckDate = (() => {
                      const d = new Date(rebalanceAppliedAt ?? new Date());
                      d.setMonth(d.getMonth() + 1);
                      return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
                    })();
                    const hasRebalanceActions = (analysis.rebalanceResult?.actions?.length ?? 0) > 0;
                    const tasks = [
                      ...(hasRebalanceActions && !rebalanceAppliedAt ? [{ done: false, text: '추천 비율로 포트폴리오 재설정하기', priority: true }] : []),
                      ...(rebalanceAppliedAt ? [{ done: true, text: '포트폴리오 리밸런싱 완료', priority: false }] : []),
                      ...failedRules.slice(0, 2).map((r: ScoreRule) => ({ done: false, text: r.action, priority: false })),
                      { done: false, text: `${nextCheckDate}에 다시 분석하기`, priority: false },
                      ...(topSector && topSector.weight > 50 ? [{ done: false, text: `${sectorLabel(topSector.sector)} 업종 뉴스 체크하기 (비중 ${topSector.weight.toFixed(0)}%)`, priority: false }] : []),
                    ].slice(0, 4);
                    return (
                      <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#94a3b8' }}>다음 할 일</div>
                        <div className="space-y-3">
                          {tasks.map((task, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{
                                background: task.done ? 'rgba(16,185,129,0.15)' : task.priority ? accent.light : '#f0ede7',
                                border: `1px solid ${task.done ? 'rgba(16,185,129,0.4)' : task.priority ? accent.hex + '60' : '#e0ddd6'}`,
                              }}>
                                {task.done
                                  ? <span style={{ fontSize: 9, color: '#10b981' }}>✓</span>
                                  : <span style={{ fontSize: 7, color: task.priority ? accent.hex : '#6b7280' }}>●</span>
                                }
                              </div>
                              <span className="text-sm leading-snug flex-1" style={{ color: task.done ? '#6b7280' : '#1c1c1e', textDecoration: task.done ? 'line-through' : 'none' }}>{task.text}</span>
                              {task.priority && !task.done && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: accent.light, color: accent.hex }}>추천</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── 개인 수익률 ── */}
                  {analysis.personalReturn !== null && (() => {
                    const rate = effectiveRate();
                    // per-item KRW 투자원금 + 수익
                    const itemData: Record<string, { investedKRW: number; profitKRW: number }> = {};
                    let totalInvestedKRW = 0;
                    let totalProfitKRW = 0;
                    for (const r of analysis.personalReturns) {
                      const it = items.find((i) => i.ticker === r.ticker);
                      if (!it || !it.amount) continue;
                      const amtKRW = isUS(it.ticker) ? Number(it.amount) * rate : Number(it.amount);
                      const p = amtKRW * r.returnPct / 100;
                      itemData[r.ticker] = { investedKRW: amtKRW, profitKRW: p };
                      totalInvestedKRW += amtKRW;
                      totalProfitKRW += p;
                    }
                    const totalCurrentKRW = totalInvestedKRW + totalProfitKRW;
                    const hasSummary = totalInvestedKRW > 0;
                    const fmtKRW = (n: number) => `₩${Math.round(n).toLocaleString('ko-KR')}`;
                    const fmtProfit = (krw: number) => {
                      const sign = krw >= 0 ? '+' : '-';
                      return `${sign}${fmtKRW(Math.abs(krw))}`;
                    };
                    const profitColor = (v: number) => v > 0 ? '#10b981' : v < 0 ? '#ef4444' : '#9ca3af';
                    return (
                    <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)' }}>
                      {/* 헤더 */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>내 투자 수익률</div>
                          <div className="text-[11px]" style={{ color: '#94a3b8' }}>평단가 기준 · 미국주식 평단가는 달러($)로 입력</div>
                        </div>
                        <div className={`text-3xl font-black shrink-0 ${retColor(analysis.personalReturn)}`}>
                          {analysis.personalReturn > 0 ? '+' : ''}{analysis.personalReturn}%
                        </div>
                      </div>

                      {/* 원금 → 평가금액 요약 */}
                      {hasSummary && (
                        <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between" style={{
                          background: totalProfitKRW >= 0 ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                          border: `1px solid ${totalProfitKRW >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        }}>
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8' }}>투자원금</div>
                            <div className="text-sm font-bold text-[#1c1c1e]">{fmtKRW(totalInvestedKRW)}</div>
                          </div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8' }}>평가금액</div>
                            <div className="text-sm font-bold text-[#1c1c1e]">{fmtKRW(totalCurrentKRW)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8' }}>평가손익</div>
                            <div className="text-sm font-bold" style={{ color: profitColor(totalProfitKRW) }}>{fmtProfit(totalProfitKRW)}</div>
                          </div>
                        </div>
                      )}

                      {/* 종목별 */}
                      <div className="space-y-3">
                        {analysis.personalReturns.map((r: PersonalReturn) => {
                          const d = itemData[r.ticker];
                          const currentVal = d ? d.investedKRW + d.profitKRW : null;
                          return (
                          <div key={r.ticker} onClick={() => setTickerModal({ ticker: r.ticker, displayName: tickerNameMap[r.ticker] || r.ticker })} className="cursor-pointer hover:opacity-75 transition-opacity">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-bold truncate max-w-[130px]" style={{ color: '#374151' }}>{tickerNameMap[r.ticker] || r.ticker}</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10, color: '#cbd5e1', flexShrink: 0 }}><path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                {currentVal != null
                                  ? <div className="text-sm font-bold text-[#1c1c1e]">{fmtKRW(currentVal)}</div>
                                  : null}
                                <div className="text-xs" style={{ color: profitColor(r.returnPct) }}>
                                  {d ? `${fmtProfit(d.profitKRW)} ` : ''}{r.returnPct > 0 ? '+' : ''}{r.returnPct}%
                                </div>
                              </div>
                            </div>
                            <div className="h-1 rounded-full" style={{ background: '#f1f5f9' }}>
                              <div className="h-1 rounded-full" style={{ width: `${Math.min(r.weight, 100)}%`, background: r.returnPct >= 0 ? '#10b981' : '#ef4444' }} />
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })()}

                  {/* ── 포트폴리오 추이 ── */}
                  {(analysis.history?.trend?.length ?? 0) > 1 && (() => {
                    const trend = analysis.history.trend;
                    const latest = trend[trend.length - 1];
                    const first = trend[0];
                    const hDelta = Math.round(latest.healthScore - first.healthScore);
                    const isImproving = hDelta >= 0;
                    return (
                      <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>Portfolio Tracking</div>
                            <div className="text-sm font-bold text-[#1c1c1e]">내 점수 추이</div>
                          </div>
                          <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{
                            background: isImproving ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${isImproving ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                          }}>
                            <span style={{ color: isImproving ? '#10b981' : '#ef4444' }}>{isImproving ? '↑' : '↓'}</span>
                            <span className="text-xs font-bold" style={{ color: isImproving ? '#10b981' : '#ef4444' }}>
                              {hDelta > 0 ? `+${hDelta}` : hDelta}점
                            </span>
                          </div>
                        </div>
                        {(() => {
                          const BAR_MAX_PX = 72;
                          const DATE_PX = 14;
                          const maxScore = Math.max(...trend.map((p: { healthScore: number }) => p.healthScore), 1);
                          return (
                            <div className="flex items-end gap-1" style={{ height: BAR_MAX_PX + DATE_PX + 4 }}>
                              {trend.map((point: { date: string; healthScore: number; diversificationScore: number }, i: number) => {
                                const isLatest = i === trend.length - 1;
                                const barH = Math.max(4, Math.round((point.healthScore / maxScore) * BAR_MAX_PX));
                                const barColor = point.healthScore >= 80 ? '#8b5cf6' : point.healthScore >= 60 ? '#f59e0b' : '#ef4444';
                                return (
                                  <div key={i} className="group relative" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <div className="absolute z-10 pointer-events-none hidden group-hover:flex flex-col items-center" style={{ bottom: DATE_PX + 8 }}>
                                      <div className="text-xs rounded px-2 py-1 whitespace-nowrap" style={{ background: '#1a1d2e', color: 'white', border: '1px solid #e2e8f0' }}>
                                        건강 {point.healthScore} · 분산 {point.diversificationScore}
                                      </div>
                                    </div>
                                    <div style={{ width: '100%', height: barH, background: barColor, borderRadius: '3px 3px 0 0', opacity: isLatest ? 1 : 0.4, transition: 'height 0.3s' }} />
                                    <div style={{ fontSize: 9, color: '#cbd5e1', height: DATE_PX, lineHeight: `${DATE_PX}px`, flexShrink: 0 }}>
                                      {new Date(point.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* ── 상세 분석 펼치기 버튼 ── */}
                  <button onClick={() => setShowDetails((v) => !v)}
                    className="w-full rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    style={{ background: '#ffffff', border: '1px solid #e8ecf4', color: '#64748b' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = accent.hex; (e.currentTarget as HTMLElement).style.color = accent.hex; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e8ecf4'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                  >
                    {showDetails ? '상세 분석 접기 ↑' : '상세 분석 더 보기 ↓'}
                  </button>

                  {/* ── 상세 분석 ── */}
                  {showDetails && (
                    <div className="space-y-4">

                      {/* 점수 산출 근거 */}
                      {analysis.scoreBreakdown.length > 0 && (
                        <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#94a3b8' }}>투자 체크리스트</div>
                          <div className="space-y-3">
                            {analysis.scoreBreakdown.map((rule: ScoreRule) => {
                              const grade = rule.passed ? 'good'
                                : Math.abs(rule.delta) >= 20 ? 'risky'
                                : 'okay';
                              const gradeStyle = {
                                good:  { label: '양호', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', text: '#10b981' },
                                okay:  { label: '주의', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  text: '#f59e0b' },
                                risky: { label: '위험', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)',   text: '#ef4444' },
                              }[grade];
                              return (
                                <div key={rule.label} className="rounded-xl p-3.5 space-y-2" style={{ background: gradeStyle.bg, border: `1px solid ${gradeStyle.border}` }}>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-[#1c1c1e] leading-snug">{rule.label}</span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${gradeStyle.border}`, color: gradeStyle.text }}>{gradeStyle.label}</span>
                                  </div>
                                  {!rule.passed && (
                                    <div className="space-y-1.5">
                                      <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                                        <span className="font-semibold" style={{ color: '#cbd5e1' }}>왜 문제인가요?</span> {rule.why}
                                      </p>
                                      <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                                        <span className="font-semibold" style={{ color: '#a78bfa' }}>어떻게 하면 좋을까요?</span> {rule.action}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 포트폴리오 인사이트 */}
                      {analysis.insights.length > 0 && (
                        <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)' }}>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: accent.hex }}>Portfolio Insights</div>
                          <ul className="space-y-2">
                            {analysis.insights.map((ins: string, i: number) => (
                              <li key={i} className="flex gap-2.5 text-sm" style={{ color: '#374151' }}>
                                <span style={{ color: accent.hex }}>•</span>{ins}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    </div>
                  )}

                  {/* 투자 유의사항 고지 */}
                  <div className="rounded-2xl px-5 py-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
                    <p className="text-xs leading-relaxed" style={{ color: '#92807a' }}>
                      <span className="font-semibold" style={{ color: '#b45309' }}>투자 유의사항</span>　본 분석은 투자 판단을 돕기 위한 참고 정보이며, 특정 종목의 매수·매도 추천이나 수익 보장을 의미하지 않습니다. 최종 투자 판단은 사용자 본인의 책임입니다.
                    </p>
                  </div>

                </div>
              );
            })()}

            </div>{/* end flex-1 min-w-0 */}

            {/* ── 뉴스 사이드 컬럼 (항상 표시) ── */}
            <div className="hidden lg:block shrink-0 sticky top-14" style={{ width: 300 }}>
              <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Personalized News</div>
                    <div className="text-sm font-bold mt-0.5" style={{ color: '#1c1c1e' }}>
                      {newsQuery ? `"${newsQuery}" 검색결과` : items.length > 0 ? '내 종목 뉴스' : '주식 · 투자 뉴스'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
                    <span className="text-[10px] font-semibold" style={{ color: '#10b981' }}>LIVE</span>
                  </div>
                </div>

                  {/* 검색창 */}
                  <div className="px-4 pb-3 pt-1">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setNewsQuery(newsQueryInput);
                        fetchPersonalizedNews(items.map((i) => i.ticker), newsQueryInput);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={newsQueryInput}
                        onChange={(e) => setNewsQueryInput(e.target.value)}
                        placeholder={items.length > 0 ? `${items[0]?.ticker ?? '종목'} 검색...` : '종목 · 키워드 검색'}
                        className="flex-1 rounded-xl px-3 py-2 text-xs outline-none transition-all"
                        style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4', color: '#1c1c1e' }}
                        onFocus={(e) => (e.target.style.borderColor = accent.hex)}
                        onBlur={(e) => (e.target.style.borderColor = '#e8ecf4')}
                      />
                      <button type="submit" className="rounded-xl px-3 py-2 text-xs font-bold transition-opacity hover:opacity-80" style={{ background: accent.hex, color: 'white' }}>
                        검색
                      </button>
                      {newsQuery && (
                        <button type="button" onClick={() => {
                          setNewsQuery(''); setNewsQueryInput('');
                          fetchPersonalizedNews(items.map((i) => i.ticker), '');
                        }} className="rounded-xl px-2 py-2 text-xs transition-opacity hover:opacity-70" style={{ background: '#f1f5f9', color: '#6b7280' }}>✕</button>
                      )}
                    </form>
                    {/* 보유 종목 빠른 선택 */}
                    {items.length > 0 && !newsQuery && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {items.slice(0, 5).map((item) => (
                          <button key={item.ticker} onClick={() => {
                            const q = item.ticker;
                            setNewsQueryInput(q); setNewsQuery(q);
                            fetchPersonalizedNews([], q);
                          }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-all hover:opacity-80"
                            style={{ background: accent.light, color: accent.hex, border: `1px solid ${accent.hex}30` }}
                          >{tickerNameMap[item.ticker] ?? item.ticker}</button>
                        ))}
                      </div>
                    )}
                  </div>

                {newsLoading ? (
                  <div className="px-4 py-6 space-y-4">
                    {[90, 75, 85, 70, 80].map((w, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="h-3.5 rounded animate-pulse" style={{ background: '#f1f5f9', width: `${w}%` }} />
                        <div className="h-3 rounded animate-pulse" style={{ background: '#f5f3ee', width: '50%' }} />
                      </div>
                    ))}
                  </div>
                ) : news.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs" style={{ color: '#94a3b8' }}>뉴스를 불러올 수 없습니다</div>
                ) : (
                  <div>
                    {news.map((item, i) => (
                      <a
                        key={i}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2.5 px-4 py-3.5 transition-all group"
                        style={{ borderBottom: i < news.length - 1 ? '1px solid #f0ede7' : 'none' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = accent.light)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <span className="text-xs font-black shrink-0 mt-0.5 w-4" style={{ color: '#94a3b8' }}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          {item.ticker && (
                            <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-1 mr-1" style={{ background: accent.light, color: accent.hex }}>
                              {tickerNameMap[item.ticker] ?? item.ticker}
                            </span>
                          )}
                          <div className="text-xs font-medium leading-snug" style={{ color: '#374151' }}>
                            {item.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {item.source && (
                              <span className="text-[10px] font-semibold truncate" style={{ color: '#94a3b8' }}>{item.source}</span>
                            )}
                            {item.pubDate && (
                              <span className="text-[10px] shrink-0" style={{ color: '#cbd5e1' }}>
                                {(() => {
                                  try {
                                    const d = new Date(item.pubDate);
                                    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
                                    if (diff < 60) return `${diff}분 전`;
                                    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
                                    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                                  } catch { return ''; }
                                })()}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ width: 12, height: 12, color: accent.hex }}>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* 티커 상세 모달 */}
      {tickerModal && (
        <TickerModal
          ticker={tickerModal.ticker}
          displayName={tickerModal.displayName}
          accentHex={accent.hex}
          accentLight={accent.light}
          rebalanceAction={tickerModal.rebalanceAction}
          drift={tickerModal.drift}
          onClose={() => setTickerModal(null)}
        />
      )}

      {/* 초보자 가이드 모달 */}
      {beginnerGuideOpen && (
        <BeginnerGuide
          accentHex={accent.hex}
          accentLight={accent.light}
          usdKrw={usdKrw?.rate ?? 1400}
          onClose={() => setBeginnerGuideOpen(false)}
          onStart={async (result) => {
            setBeginnerResult(result);
            setBeginnerGuideOpen(false);
            setActiveTab('input');
            setInputMode('amount');
            const rate = usdKrw?.rate ?? 1400;
            const newItems: PortfolioInputItem[] = [];
            for (const sg of result.suggestions) {
              try {
                const secs = await getSecurities(sg.ticker);
                // 정확한 티커 일치만 사용 (포함 검색 오매칭 방지)
                const sec = secs.find((s: Security) => s.ticker.toUpperCase() === sg.ticker.toUpperCase());
                if (sec) {
                  const displayAmt = isUS(sec.ticker) ? Math.round(sg.amountKRW / rate * 100) / 100 : sg.amountKRW;
                  // 정확한 티커가 매칭됐으므로 현재 시세를 평단가 기본값으로 사용
                  const avgCost = isUS(sec.ticker) ? (sg.priceUSD ?? 0) : (sg.priceKRW ?? 0);
                  newItems.push({ securityId: sec.id, ticker: sec.ticker, name: sec.name, displayNameKo: sec.displayNameKo, weight: sg.weight, amount: displayAmt, avgCost });
                }
              } catch { /* 검색 실패 시 무시 */ }
            }
            if (newItems.length > 0) setItems(newItems);
          }}
        />
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addPortfolioItem,
  analyzePortfolio,
  clearPortfolioItems,
  createPortfolio,
  changeMyPassword,
  deletePortfolio,
  getDataFreshness,
  getPortfolioItems,
  getPortfolios,
  getSecurities,
  updatePortfolio,
} from '@/lib/api';
import {
  AnalysisResult,
  PersonalReturn,
  Portfolio,
  PortfolioInputItem,
  RebalanceAction,
  SavedPortfolioItem,
  ScoreRule,
  Security,
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
  const color = score >= 80 ? '#8b5cf6' : score >= 60 ? '#f59e0b' : '#ef4444';
  const trackColor = score >= 80 ? 'rgba(139,92,246,0.15)' : score >= 60 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';
  const statusLabel = score >= 80 ? 'OPTIMAL' : score >= 60 ? 'GOOD' : score >= 40 ? 'FAIR' : 'RISK';
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={trackColor} strokeWidth={sw} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${prog} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`} />
        <text x={cx} y={cx - 4} textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize={Math.round(size * 0.28)} fontWeight="800">{score}</text>
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
  const { user, logout, isLoggedIn, isLoading: authLoading } = useAuth();
  const [portfolioName, setPortfolioName] = useState('My Portfolio');
  const [inputMode, setInputMode] = useState<InputMode>('amount');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Security[]>([]);
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
  const [news, setNews] = useState<{ title: string; link: string; pubDate: string; source: string }[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + Number(item.amount || 0), 0), [items]);
  const totalWeight = useMemo(() => items.reduce((sum, item) => sum + Number(item.weight || 0), 0), [items]);

  const getItemWeight = (item: PortfolioInputItem): number => {
    if (inputMode === 'amount' && totalAmount > 0) return (Number(item.amount || 0) / totalAmount) * 100;
    return Number(item.weight || 0);
  };

  const formatAmount = (n: number) => n > 0 ? n.toLocaleString('ko-KR') : '';

  const loadSavedPortfolios = async () => {
    try { setSavedPortfolios(await getPortfolios()); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.replace('/login'); return; }
    loadSavedPortfolios();
    getDataFreshness().then((d) => setLastPriceDate(d.lastPriceDate)).catch(() => {});
    setNewsLoading(true);
    fetch('/api/news').then((r) => r.json()).then((d) => setNews(d.items ?? [])).catch(() => {}).finally(() => setNewsLoading(false));
  }, [authLoading, isLoggedIn]);

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

  const handleSearch = async () => {
    if (!search.trim()) return;
    try { setError(null); setLoadingSearch(true); setSearchResults(await getSecurities(search)); }
    catch { setError('종목 검색에 실패했습니다.'); }
    finally { setLoadingSearch(false); }
  };

  const addItem = (security: Security) => {
    if (items.some((item) => item.securityId === security.id)) return;
    setItems((prev) => [...prev, { securityId: security.id, ticker: security.ticker, name: security.name, displayNameKo: security.displayNameKo, weight: 0, amount: 0, avgCost: 0 }]);
    setSearchResults([]); setSearch('');
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
      setLoadingAnalyze(true);
      let portfolioId: number;
      if (currentPortfolioId) {
        await clearPortfolioItems(currentPortfolioId);
        await updatePortfolio(currentPortfolioId, portfolioName);
        portfolioId = currentPortfolioId;
      } else {
        portfolioId = (await createPortfolio(portfolioName)).id;
      }
      for (const item of items) {
        const avgCost = Number(item.avgCost) > 0 ? Number(item.avgCost) : undefined;
        const options = inputMode === 'amount' ? { amount: Number(item.amount), avgCost } : { weight: Number(item.weight), avgCost };
        await addPortfolioItem(portfolioId, item.securityId, options);
      }
      const result = await analyzePortfolio(portfolioId, '1Y', 'SP500');
      setAnalysis(result); setCurrentPortfolioId(portfolioId); setActiveTab('result');
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
      setItems(data.map((item) => ({ securityId: item.securityId, ticker: item.security.ticker, name: item.security.name, displayNameKo: item.security.displayNameKo, weight: Number(item.weight), amount: Number(item.amount ?? 0), avgCost: Number(item.avgCost ?? 0) })));
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

  const retColor = (v: number) => v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-gray-400';

  const riskLabel = (score: number) => {
    if (score >= 80) return { text: '안전', color: '#10b981' };
    if (score >= 60) return { text: '양호', color: '#3b82f6' };
    if (score >= 40) return { text: '주의', color: '#f59e0b' };
    return { text: '위험', color: '#ef4444' };
  };

  // ── 사이드바 내용 (공통) ──────────────────────────────────────────────────
  const SidebarContent = () => (
    <>
      {/* 로고 */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}>
            <IconBarChart className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm">Portfolio Doctor</span>
        </div>
      </div>

      {/* 포트폴리오 목록 */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-2" style={{ color: '#4b5563' }}>
          내 포트폴리오
        </div>

        {sidebarError && (
          <p className="text-xs px-2 py-1.5 mb-2 rounded-lg" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)' }}>{sidebarError}</p>
        )}

        {savedPortfolios.length === 0 ? (
          <div className="text-xs px-2 py-3" style={{ color: '#374151' }}>포트폴리오가 없습니다</div>
        ) : (
          <div className="space-y-0.5">
            {savedPortfolios.map((p) => (
              <div key={p.id} className="flex gap-1 group">
                <button
                  onClick={() => handleLoadPortfolio(p)}
                  disabled={loadingPortfolioId === p.id}
                  className="flex-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all min-w-0 disabled:opacity-50"
                  style={{
                    background: currentPortfolioId === p.id ? 'rgba(124,58,237,0.2)' : 'transparent',
                    color: currentPortfolioId === p.id ? '#c4b5fd' : '#9ca3af',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: currentPortfolioId === p.id ? '#8b5cf6' : '#374151' }} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: currentPortfolioId === p.id ? 'white' : '#d1d5db' }}>{p.name}</div>
                    <div className="text-[10px]" style={{ color: '#4b5563' }}>{new Date(p.createdAt).toLocaleDateString('ko-KR')}</div>
                  </div>
                </button>
                <button
                  onClick={(e) => handleDeletePortfolio(e, p)}
                  disabled={deletingPortfolioId === p.id}
                  className="opacity-0 group-hover:opacity-100 w-7 shrink-0 flex items-center justify-center rounded-lg transition-all"
                  style={{ color: '#6b7280' }}
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
          style={{ color: '#8b5cf6', border: '1px dashed rgba(139,92,246,0.3)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <IconPlus className="w-3.5 h-3.5" /> 새 포트폴리오
        </button>
      </div>

      {/* 하단 유저 정보 */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {lastPriceDate && (
          <div className="text-[10px] mb-3 px-1" style={{ color: '#374151' }}>
            데이터 기준: {lastPriceDate}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: '#d1d5db' }}>{user?.name || user?.email}</div>
            <div className="text-[11px] truncate" style={{ color: '#4b5563' }}>{user?.email}</div>
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <button
              onClick={() => { setPwModalOpen(true); setPwMsg(null); setPwCurrent(''); setPwNew(''); setPwConfirm(''); }}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: '#6b7280' }}
              title="비밀번호 변경"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#d1d5db'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
            </button>
            <button
              onClick={() => { logout(); router.push('/login'); }}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: '#6b7280' }}
              title="로그아웃"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#d1d5db'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <IconLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#141418', color: 'white' }}>

      {/* ── 데스크탑 사이드바 ── */}
      <aside
        className="hidden lg:flex flex-col fixed h-full z-20"
        style={{ width: 220, background: '#0d0d12', borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        <SidebarContent />
      </aside>

      {/* ── 모바일 사이드바 오버레이 ── */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative z-10 flex flex-col" style={{ width: 260, background: '#0d0d12', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── 비밀번호 변경 모달 ── */}
      {pwModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm space-y-4" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="text-base font-bold text-white">비밀번호 변경</h3>
            <input
              type="password"
              placeholder="현재 비밀번호"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
              style={{ background: '#141418', border: '1.5px solid rgba(255,255,255,0.08)' }}
            />
            <input
              type="password"
              placeholder="새 비밀번호"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
              style={{ background: '#141418', border: '1.5px solid rgba(255,255,255,0.08)' }}
            />
            <input
              type="password"
              placeholder="새 비밀번호 확인"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChangeMyPassword()}
              className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
              style={{ background: '#141418', border: '1.5px solid rgba(255,255,255,0.08)' }}
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
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}
              >
                {pwSaving ? '변경 중...' : '변경'}
              </button>
              <button
                onClick={() => setPwModalOpen(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}
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
          <header className="lg:hidden flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0d0d12' }}>
            <button onClick={() => setMobileSidebarOpen(true)} className="p-1.5 rounded-lg" style={{ color: '#9ca3af' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span className="font-bold text-sm text-white">Portfolio Doctor</span>
            <button onClick={() => { logout(); router.push('/login'); }} style={{ color: '#6b7280' }}>
              <IconLogOut className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            </button>
          </header>

          {/* ── 페이지 헤더 ── */}
          <div className="px-6 lg:px-10 pt-8 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <h1 className="font-black text-white" style={{ fontSize: 34, letterSpacing: '-1px', lineHeight: 1.1 }}>
                  Portfolio Doctor
                </h1>
                <p className="text-sm mt-1.5" style={{ color: '#6b7280' }}>
                  포트폴리오의 건강 상태를 진단하고 최적화 전략을 제안합니다
                </p>
              </div>

              {/* 분석 결과 스탯 카드 */}
              {analysis && (
                <div className="flex gap-3 shrink-0 flex-wrap">
                  <div className="rounded-2xl px-5 py-3.5 text-right" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#6b7280' }}>건강 점수</div>
                    <div className="font-black" style={{ fontSize: 28, color: analysis.healthScore >= 80 ? '#8b5cf6' : analysis.healthScore >= 60 ? '#f59e0b' : '#ef4444', lineHeight: 1 }}>
                      {analysis.healthScore}
                    </div>
                  </div>
                  <div className="rounded-2xl px-5 py-3.5 text-right" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#6b7280' }}>분산도</div>
                    <div className="font-black" style={{ fontSize: 28, color: '#10b981', lineHeight: 1 }}>
                      {analysis.diversificationScore}
                    </div>
                    {analysis.diversificationPercentile > 0 && (
                      <div className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>상위 {100 - analysis.diversificationPercentile}%</div>
                    )}
                  </div>
                  {analysis.isTrial && analysis.trialEndsAt && (
                    <div className="rounded-2xl px-5 py-3.5 text-right" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
                      <div className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#a78bfa' }}>무료 체험</div>
                      <div className="font-black text-white" style={{ fontSize: 18, lineHeight: 1 }}>
                        D-{Math.max(0, Math.ceil((new Date(analysis.trialEndsAt).getTime() - Date.now()) / 86400000))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 탭 (분석 결과가 있을 때) */}
            {analysis && (
              <div className="flex gap-1 mt-5 p-1 rounded-xl w-fit" style={{ background: '#1a1a22' }}>
                {[{ key: 'input', label: '포트폴리오 편집' }, { key: 'result', label: '분석 대시보드' }].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as 'input' | 'result')}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: activeTab === t.key ? '#7c3aed' : 'transparent',
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
          <div className="flex-1 px-6 lg:px-10 py-6 flex gap-6 items-start">

            {/* ── 메인 콘텐츠 (탭) ── */}
            <div className="flex-1 min-w-0">

            {/* ── 입력 탭 ── */}
            {activeTab === 'input' && (
              <div className="max-w-2xl space-y-5">

                {/* 포트폴리오 이름 */}
                <div className="rounded-2xl p-5" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>포트폴리오 이름</label>
                  <input
                    value={portfolioName}
                    onChange={(e) => setPortfolioName(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-white text-sm font-semibold outline-none transition-all"
                    style={{ background: '#141418', border: '1.5px solid rgba(255,255,255,0.06)' }}
                    onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.06)')}
                  />
                </div>

                {/* 종목 검색 */}
                <div className="rounded-2xl p-5" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>종목 검색</label>
                  <div className="flex gap-2">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="flex-1 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                      style={{ background: '#141418', border: '1.5px solid rgba(255,255,255,0.06)' }}
                      onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
                      onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.06)')}
                      placeholder="AAPL · 애플 · Apple · 삼성..."
                    />
                    {(search || searchResults.length > 0) && (
                      <button
                        onClick={() => { setSearch(''); setSearchResults([]); }}
                        className="rounded-xl px-3 py-3 text-sm font-bold transition-all"
                        style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}
                        title="검색 취소"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      onClick={handleSearch}
                      disabled={loadingSearch}
                      className="rounded-xl px-5 py-3 text-sm font-bold text-white disabled:opacity-50 transition-all"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}
                    >
                      {loadingSearch ? '...' : '검색'}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                        <span className="text-xs" style={{ color: '#6b7280' }}>검색결과 {searchResults.length}개</span>
                        <button onClick={() => { setSearchResults([]); setSearch(''); }} className="text-xs px-2 py-0.5 rounded-lg transition-all" style={{ color: '#9ca3af', background: 'rgba(255,255,255,0.05)' }}>취소</button>
                      </div>
                      {searchResults.map((s) => (
                        <button key={s.id} onClick={() => addItem(s)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left transition-all"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.1)')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                        >
                          <div>
                            <span className="font-bold text-white text-sm">{s.ticker}</span>
                            <span className="text-sm ml-2" style={{ color: '#9ca3af' }}>{s.displayNameKo ?? s.name}</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>{s.sector ?? 'N/A'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 포트폴리오 구성 */}
                {items.length > 0 && (
                  <div className="rounded-2xl p-5" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>
                        보유 종목 ({items.length})
                      </label>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold" style={{ color: inputMode === 'amount' ? (totalAmount > 0 ? '#10b981' : '#4b5563') : (Math.round(totalWeight) === 100 ? '#10b981' : '#f59e0b') }}>
                          {inputMode === 'amount' ? `₩${formatAmount(totalAmount) || '0'}` : `${totalWeight.toFixed(1)}%`}
                        </span>
                        <div className="flex rounded-lg overflow-hidden text-xs" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                          {(['amount', 'weight'] as const).map((m) => (
                            <button key={m} onClick={() => setInputMode(m)}
                              className="px-3 py-1.5 font-semibold transition-all"
                              style={{ background: inputMode === m ? '#7c3aed' : 'transparent', color: inputMode === m ? 'white' : '#6b7280' }}
                            >
                              {m === 'amount' ? '금액' : '비중'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item.securityId} className="rounded-xl px-4 py-3 space-y-2.5" style={{ background: '#141418', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-white text-sm">{item.ticker}</span>
                              <span className="text-xs ml-2" style={{ color: '#6b7280' }}>{item.displayNameKo ?? item.name}</span>
                            </div>
                            <button onClick={() => removeItem(item.securityId)} style={{ color: '#374151' }}
                              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
                              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#374151')}
                            >
                              <IconX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            {inputMode === 'amount' ? (
                              <>
                                <input type="text" inputMode="numeric"
                                  value={item.amount > 0 ? item.amount.toLocaleString('ko-KR') : ''}
                                  onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ''); updateAmount(item.securityId, raw ? Number(raw) : 0); }}
                                  className="flex-1 rounded-lg px-3 py-1.5 text-right text-white text-sm outline-none tabular-nums"
                                  style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}
                                  placeholder="0"
                                  onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
                                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.06)')}
                                />
                                <span className="text-xs w-12 text-right shrink-0" style={{ color: '#4b5563' }}>{getItemWeight(item).toFixed(1)}%</span>
                              </>
                            ) : (
                              <>
                                <input type="number" min={0} max={100}
                                  value={item.weight || ''}
                                  onChange={(e) => updateWeight(item.securityId, Number(e.target.value))}
                                  className="w-20 rounded-lg px-2 py-1.5 text-center text-white text-sm outline-none"
                                  style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}
                                  placeholder="0"
                                />
                                <span className="text-sm shrink-0" style={{ color: '#6b7280' }}>%</span>
                              </>
                            )}
                            <input type="text" inputMode="numeric"
                              value={item.avgCost > 0 ? item.avgCost.toLocaleString('ko-KR') : ''}
                              onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ''); updateAvgCost(item.securityId, raw ? Number(raw) : 0); }}
                              className="w-24 rounded-lg px-2 py-1.5 text-right text-sm outline-none tabular-nums"
                              style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)', color: '#6b7280' }}
                              placeholder="평단가"
                              onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.06)')}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {items.length === 0 && (
                  <div className="rounded-2xl flex flex-col items-center justify-center py-16 text-center" style={{ background: '#1c1c26', border: '1px dashed rgba(255,255,255,0.06)' }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(124,58,237,0.1)' }}>
                      <IconPieChart className="w-7 h-7" style={{ color: '#7c3aed' }} />
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">종목을 추가해보세요</p>
                    <p className="text-xs" style={{ color: '#4b5563' }}>위에서 검색해서 포트폴리오를 구성하세요</p>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                    <IconWarning className="w-4 h-4 shrink-0" />{error}
                  </div>
                )}

                <button onClick={handleAnalyze} disabled={loadingAnalyze || items.length === 0}
                  className="w-full rounded-2xl py-4 text-base font-black text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}
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

              return (
                <div className="space-y-5">

                  {/* ── Row 1: Health Score + Asset Allocation ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* Health Score 카드 */}
                    <div className="rounded-2xl p-6" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6b7280' }}>Health Score</div>
                          <div className="text-sm font-bold" style={{ color: risk.color }}>{risk.text}</div>
                        </div>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)' }}>
                          <IconShield className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: '#8b5cf6' }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-6 mb-5">
                        <ScoreRing score={analysis.healthScore} size={110} />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm text-white leading-snug font-medium">{conclusion}</p>
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
                        <div className="rounded-xl p-3" style={{ background: '#141418' }}>
                          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#4b5563' }}>투자 스타일</div>
                          <div className="text-sm font-bold text-white">{analysis.portfolioStyle}</div>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: '#141418' }}>
                          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#4b5563' }}>분산도</div>
                          <div className="text-sm font-bold" style={{ color: '#10b981' }}>{analysis.diversificationScore}</div>
                          {analysis.diversificationPercentile > 0 && (
                            <div className="text-[10px] mt-0.5" style={{ color: '#4b5563' }}>
                              전체 유저 상위 {100 - analysis.diversificationPercentile}%
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Asset Allocation 카드 */}
                    <div className="rounded-2xl p-6" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6b7280' }}>Asset Allocation</div>
                          <div className="text-sm font-bold text-white">섹터별 분산 현황</div>
                        </div>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
                          <IconPieChart className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: '#10b981' }} />
                        </div>
                      </div>

                      <div className="space-y-3">
                        {analysis.sectorExposure.slice(0, 6).map((s, i) => (
                          <div key={s.sector}>
                            <div className="flex justify-between text-sm mb-1.5">
                              <span className="font-medium" style={{ color: '#d1d5db' }}>{sectorLabel(s.sector)}</span>
                              <span className="font-bold" style={{ color: SECTOR_COLORS[i % SECTOR_COLORS.length] }}>{Number(s.weight).toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                              <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(s.weight, 100)}%`, background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── 경고 알림 ── */}
                  {analysis.history?.alerts?.length > 0 && (
                    <div className="space-y-2">
                      {analysis.history.alerts.map((alert: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <IconWarning className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                          <span className="text-sm leading-relaxed" style={{ color: '#fcd34d' }}>{alert}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Row 2: 리밸런싱 + 시장 성과 ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* 리밸런싱 가이드 (2/3) */}
                    {analysis.rebalanceResult && (
                      <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {/* 헤더 */}
                        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(16,185,129,0.08))' }}>
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#6b7280' }}>Rebalancing Strategy</div>
                            {scoreDelta > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">리밸런싱 후 분산도</span>
                                <span className="font-black" style={{ color: '#9ca3af' }}>{analysis.rebalanceResult.currentScore}</span>
                                <span style={{ color: '#4b5563' }}>→</span>
                                <span className="font-black" style={{ color: '#10b981' }}>{analysis.rebalanceResult.improvedScore}</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>+{scoreDelta}점</span>
                              </div>
                            ) : (
                              <div className="text-sm font-bold" style={{ color: '#10b981' }}>포트폴리오가 이미 최적화되어 있습니다</div>
                            )}
                          </div>
                        </div>

                        {/* 콘텐츠 + 페이월 */}
                        <div className="relative">
                          <div className={`p-5 space-y-3${!isPremium ? ' blur-[3px] select-none pointer-events-none' : ''}`}>
                            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Recommended Actions</div>
                            {top3Actions.map((action: RebalanceAction, i: number) => (
                              <div key={action.ticker} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{
                                background: action.type === 'reduce' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                                border: `1px solid ${action.type === 'reduce' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                              }}>
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{
                                  background: action.type === 'reduce' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                                  color: action.type === 'reduce' ? '#f87171' : '#34d399',
                                }}>{i + 1}</div>
                                <span className="text-sm text-white flex-1">{action.text}</span>
                                <span className="font-black text-lg" style={{ color: action.type === 'reduce' ? '#ef4444' : '#10b981' }}>
                                  {action.type === 'reduce' ? '↓' : '↑'}
                                </span>
                              </div>
                            ))}
                            {analysis.rebalanceResult.beforeAfterSummary && (
                              <div className="rounded-xl px-4 py-3 mt-2" style={{ background: '#141418', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="text-xs mb-1" style={{ color: '#4b5563' }}>Before / After 시뮬레이션</div>
                                <div className="text-sm font-semibold text-white">{analysis.rebalanceResult.beforeAfterSummary}</div>
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
                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
                                  <IconLock className="w-5 h-5" style={{ color: '#c4b5fd' }} />
                                </div>
                                <div className="text-white font-bold text-sm mb-1">리밸런싱 가이드 잠금</div>
                                <div className="text-xs mb-4 leading-relaxed" style={{ color: '#6b7280' }}>구체적 비율 · Before/After 시뮬레이션<br />미래 리스크 분석 포함</div>
                                <button onClick={handleCheckout} disabled={checkoutLoading}
                                  className="w-full rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60 transition-all"
                                  style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}
                                >
                                  {checkoutLoading ? '이동 중...' : '프리미엄으로 보기 — ₩2,900'}
                                </button>
                                <div className="text-[10px] mt-2" style={{ color: '#374151' }}>단건 결제 · 구독 아님</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 시장 성과 (1/3) */}
                    <div className="rounded-2xl p-5" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6b7280' }}>Market Performance</div>
                      <div className="space-y-4">
                        {[
                          { label: '내 포트폴리오', sub: '보유 비중 가중 수익률', value: analysis.portfolioReturn },
                          { label: 'S&P 500', sub: '벤치마크', value: analysis.benchmarkReturn },
                          { label: '초과 수익률', sub: '포트폴리오 − 벤치마크', value: analysis.excessReturn },
                        ].map(({ label, sub, value }) => (
                          <div key={label}>
                            <div className="flex justify-between items-baseline mb-1">
                              <div>
                                <div className="text-xs font-medium text-white">{label}</div>
                                <div className="text-[10px]" style={{ color: '#4b5563' }}>{sub}</div>
                              </div>
                              <div className={`text-lg font-black ${retColor(value)}`}>{value > 0 ? '+' : ''}{value}%</div>
                            </div>
                            <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                              <div className="h-1 rounded-full" style={{ width: `${Math.min(Math.abs(value), 50) * 2}%`, background: value >= 0 ? '#10b981' : '#ef4444' }} />
                            </div>
                          </div>
                        ))}
                        <div className="rounded-xl px-3 py-2.5 mt-2" style={{ background: '#141418' }}>
                          <div className="text-[10px] mb-1" style={{ color: '#4b5563' }}>상위 3종목 집중도</div>
                          <div className="text-lg font-black text-white">{analysis.top3Concentration}%</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── 개인 수익률 ── */}
                  {analysis.personalReturn !== null && (
                    <div className="rounded-2xl p-5" style={{ background: '#1c1c26', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6b7280' }}>내 투자 수익률</div>
                          <div className="text-[11px]" style={{ color: '#4b5563' }}>평단가 입력 기준 · 미국주식 평단가는 달러($)로 입력</div>
                        </div>
                        <div className={`text-3xl font-black ${retColor(analysis.personalReturn)}`}>
                          {analysis.personalReturn > 0 ? '+' : ''}{analysis.personalReturn}%
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        {analysis.personalReturns.map((r: PersonalReturn) => (
                          <div key={r.ticker} className="flex items-center gap-3">
                            <span className="text-sm font-bold w-20 shrink-0 truncate" style={{ color: '#d1d5db' }}>{tickerNameMap[r.ticker] || r.ticker}</span>
                            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${Math.min(Math.abs(r.returnPct), 100)}%`, background: r.returnPct >= 0 ? '#10b981' : '#ef4444' }} />
                            </div>
                            <span className={`w-14 text-right text-sm font-bold shrink-0 ${retColor(r.returnPct)}`}>{r.returnPct > 0 ? '+' : ''}{r.returnPct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── 상세 분석 펼치기 버튼 ── */}
                  <button onClick={() => setShowDetails((v) => !v)}
                    className="w-full rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)', color: '#9ca3af' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.4)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#9ca3af'; }}
                  >
                    {showDetails ? '상세 분석 접기 ↑' : '상세 분석 더 보기 ↓'}
                  </button>

                  {/* ── 상세 분석 ── */}
                  {showDetails && (
                    <div className="space-y-4">

                      {/* 점수 산출 근거 */}
                      {analysis.scoreBreakdown.length > 0 && (
                        <div className="rounded-2xl p-5" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6b7280' }}>Score Breakdown</div>
                          <div className="space-y-2.5">
                            {analysis.scoreBreakdown.map((rule: ScoreRule) => (
                              <div key={rule.label} className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: rule.passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                                    {rule.passed ? <IconCheck className="w-3 h-3" style={{ color: '#10b981' }} /> : <IconX className="w-3 h-3" style={{ color: '#ef4444' }} />}
                                  </div>
                                  <span className="text-sm" style={{ color: rule.passed ? '#d1d5db' : '#6b7280' }}>{rule.label}</span>
                                </div>
                                {!rule.passed && <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{rule.delta}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 포트폴리오 인사이트 */}
                      {analysis.insights.length > 0 && (
                        <div className="rounded-2xl p-5" style={{ background: '#1c1c26', border: '1px solid rgba(139,92,246,0.2)' }}>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8b5cf6' }}>Portfolio Insights</div>
                          <ul className="space-y-2">
                            {analysis.insights.map((ins: string, i: number) => (
                              <li key={i} className="flex gap-2.5 text-sm" style={{ color: '#d1d5db' }}>
                                <span style={{ color: '#7c3aed' }}>•</span>{ins}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 점수 추이 */}
                      {analysis.history?.trend?.length > 1 && (
                        <div className="rounded-2xl p-5" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6b7280' }}>Score History</div>
                          <div className="flex items-end gap-1.5 h-16">
                            {analysis.history.trend.map((point: { date: string; healthScore: number; diversificationScore: number }, i: number) => {
                              const isLatest = i === analysis.history.trend.length - 1;
                              const hPct = Math.max(4, point.healthScore);
                              const barColor = point.healthScore >= 80 ? '#8b5cf6' : point.healthScore >= 60 ? '#f59e0b' : '#ef4444';
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                  <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                                    <div className="text-xs rounded px-2 py-1 whitespace-nowrap" style={{ background: '#2a2a38', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                                      건강 {point.healthScore} · 분산 {point.diversificationScore}
                                    </div>
                                  </div>
                                  <div className="w-full rounded-t transition-all" style={{ height: `${hPct}%`, background: barColor, opacity: isLatest ? 1 : 0.4 }} />
                                  <div className="text-[10px]" style={{ color: '#374151' }}>{new Date(point.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })()}

            </div>{/* end flex-1 min-w-0 */}

            {/* ── 뉴스 사이드 컬럼 (항상 표시) ── */}
            <div className="hidden lg:block shrink-0 sticky top-14" style={{ width: 300 }}>
              <div className="rounded-2xl overflow-hidden" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>Market News</div>
                    <div className="text-sm font-bold text-white mt-0.5">주식 · 투자 뉴스</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
                    <span className="text-[10px] font-semibold" style={{ color: '#10b981' }}>LIVE</span>
                  </div>
                </div>

                {newsLoading ? (
                  <div className="px-4 py-6 space-y-4">
                    {[90, 75, 85, 70, 80].map((w, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="h-3.5 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)', width: `${w}%` }} />
                        <div className="h-3 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', width: '50%' }} />
                      </div>
                    ))}
                  </div>
                ) : news.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs" style={{ color: '#4b5563' }}>뉴스를 불러올 수 없습니다</div>
                ) : (
                  <div>
                    {news.map((item, i) => (
                      <a
                        key={i}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2.5 px-4 py-3.5 transition-all group"
                        style={{ borderBottom: i < news.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.07)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <span className="text-xs font-black shrink-0 mt-0.5 w-4" style={{ color: '#4b5563' }}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium leading-snug" style={{ color: '#d1d5db' }}>
                            {item.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {item.source && (
                              <span className="text-[10px] font-semibold truncate" style={{ color: '#6b7280' }}>{item.source}</span>
                            )}
                            {item.pubDate && (
                              <span className="text-[10px] shrink-0" style={{ color: '#374151' }}>
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
                          style={{ width: 12, height: 12, color: '#7c3aed' }}>
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
    </div>
  );
}

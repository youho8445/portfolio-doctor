'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addPortfolioItem,
  analyzePortfolio,
  clearPortfolioItems,
  createPortfolio,
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

export default function AnalyzerPage() {
  const router = useRouter();
  const { user, logout, isLoggedIn } = useAuth();
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

  // ── ticker → 한글명 룩업 ──────────────────────────────────────────────────
  const tickerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of items) {
      map[item.ticker] = item.displayNameKo ?? item.name ?? item.ticker;
    }
    return map;
  }, [items]);

  // ── 섹터 한글 매핑 ─────────────────────────────────────────────────────────
  const sectorKo: Record<string, string> = {
    'Information Technology': 'IT',
    'Financials': '금융',
    'Health Care': '헬스케어',
    'Consumer Discretionary': '경기소비재',
    'Communication Services': '커뮤니케이션',
    'Industrials': '산업재',
    'Consumer Staples': '필수소비재',
    'Energy': '에너지',
    'Materials': '소재',
    'Real Estate': '부동산',
    'Utilities': '유틸리티',
    'Unknown': '기타',
    'ETF': 'ETF',
    'Cash': '현금',
  };
  const sectorLabel = (s: string) => sectorKo[s] ?? s;

  // ── 합산 ──────────────────────────────────────────────────────────────────
  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [items],
  );

  const totalWeight = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.weight || 0), 0),
    [items],
  );

  const getItemWeight = (item: PortfolioInputItem): number => {
    if (inputMode === 'amount' && totalAmount > 0) {
      return (Number(item.amount || 0) / totalAmount) * 100;
    }
    return Number(item.weight || 0);
  };

  const formatAmount = (n: number) =>
    n > 0 ? n.toLocaleString('ko-KR') : '';

  // ── 초기 로드 ─────────────────────────────────────────────────────────────
  const loadSavedPortfolios = async () => {
    try {
      const data = await getPortfolios();
      setSavedPortfolios(data);
    } catch {
      // 무시
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    loadSavedPortfolios();
    getDataFreshness()
      .then((d) => setLastPriceDate(d.lastPriceDate))
      .catch(() => {});
  }, [isLoggedIn]);

  // ── 검색 ──────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!search.trim()) return;
    try {
      setError(null);
      setLoadingSearch(true);
      const data = await getSecurities(search);
      setSearchResults(data);
    } catch {
      setError('종목 검색에 실패했습니다.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const addItem = (security: Security) => {
    if (items.some((item) => item.securityId === security.id)) return;
    setItems((prev) => [
      ...prev,
      {
        securityId: security.id,
        ticker: security.ticker,
        name: security.name,
        displayNameKo: security.displayNameKo,
        weight: 0,
        amount: 0,
        avgCost: 0,
      },
    ]);
    setSearchResults([]);
    setSearch('');
  };

  const updateAmount = (securityId: number, amount: number) => {
    setItems((prev) =>
      prev.map((item) => (item.securityId === securityId ? { ...item, amount } : item)),
    );
  };

  const updateWeight = (securityId: number, weight: number) => {
    setItems((prev) =>
      prev.map((item) => (item.securityId === securityId ? { ...item, weight } : item)),
    );
  };

  const updateAvgCost = (securityId: number, avgCost: number) => {
    setItems((prev) =>
      prev.map((item) => (item.securityId === securityId ? { ...item, avgCost } : item)),
    );
  };

  const removeItem = (securityId: number) => {
    setItems((prev) => prev.filter((item) => item.securityId !== securityId));
  };

  // ── 분석 ──────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    try {
      setError(null);
      if (!items.length) {
        setError('종목을 하나 이상 추가하세요.');
        return;
      }

      if (inputMode === 'amount') {
        if (totalAmount === 0) {
          setError('투자금액을 입력하세요.');
          return;
        }
        if (items.some((item) => Number(item.amount) <= 0)) {
          setError('모든 종목에 투자금액을 입력하세요.');
          return;
        }
      } else {
        if (Math.round(totalWeight * 100) / 100 !== 100) {
          setError(`비중 합계가 100%여야 합니다. (현재: ${totalWeight.toFixed(1)}%)`);
          return;
        }
      }

      setLoadingAnalyze(true);

      let portfolioId: number;
      if (currentPortfolioId) {
        await clearPortfolioItems(currentPortfolioId);
        await updatePortfolio(currentPortfolioId, portfolioName);
        portfolioId = currentPortfolioId;
      } else {
        const portfolio = await createPortfolio(portfolioName);
        portfolioId = portfolio.id;
      }

      for (const item of items) {
        const avgCost = Number(item.avgCost) > 0 ? Number(item.avgCost) : undefined;
        const options =
          inputMode === 'amount'
            ? { amount: Number(item.amount), avgCost }
            : { weight: Number(item.weight), avgCost };
        await addPortfolioItem(portfolioId, item.securityId, options);
      }

      const result = await analyzePortfolio(portfolioId, '1Y', 'SP500');
      setAnalysis(result);
      setCurrentPortfolioId(portfolioId);
      setActiveTab('result');
      await loadSavedPortfolios();
    } catch {
      setError('분석에 실패했습니다. 백엔드 서버를 확인하세요.');
    } finally {
      setLoadingAnalyze(false);
    }
  };

  // ── 저장된 포트폴리오 불러오기 ────────────────────────────────────────────
  const handleLoadPortfolio = async (portfolio: Portfolio) => {
    try {
      setLoadingPortfolioId(portfolio.id);
      const data: SavedPortfolioItem[] = await getPortfolioItems(portfolio.id);
      setPortfolioName(portfolio.name);

      const hasAmounts = data.some((item) => item.amount !== null && Number(item.amount) > 0);
      setInputMode(hasAmounts ? 'amount' : 'weight');

      setItems(
        data.map((item) => ({
          securityId: item.securityId,
          ticker: item.security.ticker,
          name: item.security.name,
          displayNameKo: item.security.displayNameKo,
          weight: Number(item.weight),
          amount: Number(item.amount ?? 0),
          avgCost: Number(item.avgCost ?? 0),
        })),
      );
      setCurrentPortfolioId(portfolio.id);
      setAnalysis(null);
      setError(null);
    } catch {
      setError('포트폴리오 불러오기에 실패했습니다.');
    } finally {
      setLoadingPortfolioId(null);
    }
  };

  // ── 저장된 포트폴리오 삭제 ────────────────────────────────────────────────
  const handleDeletePortfolio = async (e: React.MouseEvent, portfolio: Portfolio) => {
    e.stopPropagation();
    if (!window.confirm(`"${portfolio.name}" 포트폴리오를 삭제하시겠습니까?`)) return;
    try {
      setSidebarError(null);
      setDeletingPortfolioId(portfolio.id);
      await deletePortfolio(portfolio.id);
      setSavedPortfolios((prev) => prev.filter((p) => p.id !== portfolio.id));
      if (currentPortfolioId === portfolio.id) setCurrentPortfolioId(null);
    } catch (e) {
      setSidebarError(`삭제 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    } finally {
      setDeletingPortfolioId(null);
    }
  };

  // ── 결과 색상 ─────────────────────────────────────────────────────────────
  const scoreColor = analysis
    ? analysis.healthScore >= 80
      ? 'text-green-400'
      : analysis.healthScore >= 50
        ? 'text-yellow-400'
        : 'text-red-400'
    : 'text-purple-400';

  const retColor = (v: number) =>
    v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-gray-300';

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 sm:p-6">
      <div className="mx-auto max-w-screen-xl">

        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              Portfolio <span className="text-purple-400">Doctor</span>
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5">건강진단 · 리밸런싱 · 벤치마크 비교</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastPriceDate && (
              <div className="hidden sm:block rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-right">
                <div className="text-xs text-gray-500">데이터 업데이트</div>
                <div className="text-sm font-semibold text-gray-300">{lastPriceDate}</div>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2">
              <span className="text-xs text-gray-400 hidden sm:inline">{user?.name}</span>
              <button
                onClick={() => { logout(); router.push('/login'); }}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>

        {/* 모바일 탭 */}
        <div className="flex lg:hidden mb-4 rounded-xl overflow-hidden border border-gray-800">
          <button
            onClick={() => setActiveTab('input')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${activeTab === 'input' ? 'bg-purple-600 text-white' : 'bg-gray-900 text-gray-400'}`}
          >
            종목 입력
          </button>
          <button
            onClick={() => setActiveTab('result')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${activeTab === 'result' ? 'bg-purple-600 text-white' : 'bg-gray-900 text-gray-400'}`}
          >
            분석 결과{analysis && <span className="ml-1.5 text-[10px] bg-purple-800 text-purple-200 px-1.5 py-0.5 rounded-full align-middle">NEW</span>}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_1fr] gap-6">

          {/* ── 저장된 포트폴리오 사이드바 ── */}
          <div className={`${activeTab !== 'input' ? 'hidden lg:flex' : 'flex'} rounded-2xl border border-gray-800 bg-gray-900 p-5 flex-col gap-3 h-fit`}>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">저장된 포트폴리오</h2>

            {sidebarError && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded px-2 py-1.5">
                {sidebarError}
              </p>
            )}

            {savedPortfolios.length === 0 ? (
              <p className="text-xs text-gray-600 py-4 text-center">아직 저장된 포트폴리오가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {savedPortfolios.map((p) => (
                  <li key={p.id} className="flex items-stretch gap-1">
                    <button
                      onClick={() => handleLoadPortfolio(p)}
                      disabled={loadingPortfolioId === p.id}
                      className="flex-1 text-left rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 hover:border-purple-600 hover:bg-gray-800 transition-colors disabled:opacity-50 min-w-0"
                    >
                      <div className="text-sm font-semibold text-white truncate">{p.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(p.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </button>
                    <button
                      onClick={(e) => handleDeletePortfolio(e, p)}
                      disabled={deletingPortfolioId === p.id}
                      className="rounded-lg border border-gray-700 bg-gray-950 px-2 hover:border-red-700 hover:bg-red-950/40 hover:text-red-400 text-gray-600 transition-colors disabled:opacity-50"
                      title="삭제"
                    >
                      {deletingPortfolioId === p.id ? '…' : '×'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── 입력 패널 ── */}
          <div className={`${activeTab !== 'input' ? 'hidden lg:block' : ''} rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6 space-y-6`}>

            {/* 포트폴리오 이름 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">포트폴리오 이름</label>
              <input
                value={portfolioName}
                onChange={(e) => setPortfolioName(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-purple-500"
                placeholder="My Portfolio"
              />
            </div>

            {/* 종목 검색 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">종목 검색</label>
              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-purple-500"
                  placeholder="AAPL · 애플 · Apple · 삼성..."
                />
                <button
                  onClick={handleSearch}
                  disabled={loadingSearch}
                  className="rounded-lg bg-purple-600 px-5 py-3 font-semibold hover:bg-purple-500 disabled:opacity-50 transition-colors"
                >
                  {loadingSearch ? '...' : '검색'}
                </button>
              </div>

              {/* 검색 결과 */}
              {searchResults.length > 0 && (
                <div className="mt-2 rounded-lg border border-gray-700 bg-gray-950 overflow-hidden">
                  {searchResults.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => addItem(s)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800 border-b border-gray-800 last:border-0 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-white">{s.ticker}</span>
                        <span className="text-gray-300 ml-2 text-sm">
                          {s.displayNameKo ?? s.name}
                        </span>
                        {s.displayNameKo && (
                          <span className="text-gray-600 ml-1 text-xs">{s.name}</span>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded ml-2">
                        {s.sector ?? 'N/A'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 포트폴리오 구성 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm text-gray-400">포트폴리오 구성</label>

                {/* 입력 모드 토글 */}
                <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs">
                  <button
                    onClick={() => setInputMode('amount')}
                    className={`px-3 py-1.5 font-semibold transition-colors ${
                      inputMode === 'amount'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-950 text-gray-400 hover:text-white'
                    }`}
                  >
                    투자금액
                  </button>
                  <button
                    onClick={() => setInputMode('weight')}
                    className={`px-3 py-1.5 font-semibold transition-colors ${
                      inputMode === 'weight'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-950 text-gray-400 hover:text-white'
                    }`}
                  >
                    비중(%)
                  </button>
                </div>
              </div>

              {/* 합계 표시 */}
              <div className="flex justify-end mb-2">
                {inputMode === 'amount' ? (
                  <span className={`text-sm font-bold ${totalAmount > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                    총 {formatAmount(totalAmount) || '0'}
                  </span>
                ) : (
                  <span className={`text-sm font-bold ${Math.round(totalWeight) === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                    합계: {totalWeight.toFixed(1)}%
                  </span>
                )}
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-600 border border-dashed border-gray-800 rounded-lg">
                  위에서 종목을 검색해서 추가하세요
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.securityId}
                      className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 space-y-2"
                    >
                      {/* 종목명 + 삭제 */}
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="font-semibold text-white text-sm">{item.ticker}</span>
                          <span className="text-gray-500 text-xs ml-1.5 truncate">
                            {item.displayNameKo ?? item.name}
                          </span>
                        </div>
                        <button
                          onClick={() => removeItem(item.securityId)}
                          className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none ml-2 shrink-0"
                        >
                          ×
                        </button>
                      </div>

                      {/* 입력 행 */}
                      <div className="flex items-center gap-2">
                        {inputMode === 'amount' ? (
                          <>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={item.amount > 0 ? item.amount.toLocaleString('ko-KR') : ''}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9]/g, '');
                                updateAmount(item.securityId, raw ? Number(raw) : 0);
                              }}
                              className="flex-1 min-w-0 rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-right text-white text-sm outline-none focus:border-purple-500 tabular-nums tracking-tight"
                              placeholder="0"
                            />
                            <span className="text-xs text-gray-400 w-12 text-right shrink-0">
                              {getItemWeight(item).toFixed(1)}%
                            </span>
                          </>
                        ) : (
                          <>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={item.weight || ''}
                              onChange={(e) => updateWeight(item.securityId, Number(e.target.value))}
                              className="w-20 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-center text-white text-sm outline-none focus:border-purple-500"
                              placeholder="0"
                            />
                            <span className="text-gray-500 text-sm shrink-0">%</span>
                          </>
                        )}
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.avgCost > 0 ? item.avgCost.toLocaleString('ko-KR') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            updateAvgCost(item.securityId, raw ? Number(raw) : 0);
                          }}
                          className="w-24 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-right text-gray-400 text-sm outline-none focus:border-blue-500 tabular-nums"
                          placeholder="평단가"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 에러 */}
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* 분석 버튼 */}
            <button
              onClick={handleAnalyze}
              disabled={loadingAnalyze || items.length === 0}
              className="w-full rounded-xl bg-purple-600 px-4 py-4 text-lg font-bold hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loadingAnalyze ? '분석 중...' : '포트폴리오 분석하기 →'}
            </button>
          </div>

          {/* ── 결과 패널 ── */}
          <div className={`${activeTab !== 'result' ? 'hidden lg:block' : ''} rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6`}>
            <h2 className="text-xl font-bold mb-6 text-gray-200">분석 결과</h2>

            {!analysis ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-600 border border-dashed border-gray-800 rounded-xl px-4">
                <div className="text-5xl mb-3">📊</div>
                <p className="text-center text-sm">종목을 추가하고<br /><span className="text-purple-500 font-semibold">포트폴리오 분석하기</span>를 눌러보세요</p>
                <p className="text-center text-xs mt-2 text-gray-700">건강점수 · 리밸런싱 · 벤치마크 비교 제공</p>
                <button
                  onClick={() => setActiveTab('input')}
                  className="lg:hidden mt-4 text-xs text-purple-400 border border-purple-800 rounded-lg px-4 py-2 hover:bg-purple-950/40 transition-colors"
                >
                  ← 종목 입력하러 가기
                </button>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Score 카드 2개 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 flex items-center gap-4">
                    <div className={`text-5xl font-black ${scoreColor}`}>
                      {analysis.healthScore}
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Health Score</div>
                      <div className="text-white font-semibold text-sm mt-0.5">{analysis.portfolioName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{analysis.period} · {analysis.benchmarkCode}</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 flex items-center gap-4">
                    <div className={`text-5xl font-black ${
                      analysis.diversificationScore >= 70 ? 'text-blue-400'
                      : analysis.diversificationScore >= 40 ? 'text-yellow-400'
                      : 'text-red-400'
                    }`}>
                      {analysis.diversificationScore}
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Diversification</div>
                      <div className="text-white font-semibold text-sm mt-0.5">{analysis.portfolioStyle}</div>
                    </div>
                  </div>
                </div>

                {/* Score Breakdown */}
                {analysis.scoreBreakdown.length > 0 && (
                  <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                    <div className="text-sm text-gray-400 mb-3">점수 산출 근거</div>
                    <div className="space-y-2">
                      {analysis.scoreBreakdown.map((rule: ScoreRule) => (
                        <div key={rule.label} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span>{rule.passed ? '✅' : '❌'}</span>
                            <span className={rule.passed ? 'text-gray-300' : 'text-gray-500'}>
                              {rule.label}
                            </span>
                          </div>
                          <span className={rule.passed ? 'text-gray-600' : 'text-red-400 font-semibold'}>
                            {rule.passed ? '—' : `${rule.delta}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── 섹션 A: 시장 성과 ── */}
                <div className="rounded-xl border border-gray-700 bg-gray-950 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">📈 시장 성과</span>
                    <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">최근 1년 · yfinance 기준</span>
                  </div>
                  <p className="text-[11px] text-gray-600 -mt-1">내가 사고팔지 않았어도, 이 종목들이 시장에서 얼마나 올랐는지를 보여줍니다.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '내 포트폴리오', sub: '보유 비중 가중 수익률', value: analysis.portfolioReturn },
                      { label: 'S&P 500 (벤치마크)', sub: '같은 기간 지수 수익률', value: analysis.benchmarkReturn },
                      { label: '초과 수익률', sub: '포트폴리오 − 벤치마크', value: analysis.excessReturn },
                      { label: '상위 3종목 집중도', sub: '높을수록 분산 부족', value: analysis.top3Concentration, noColor: true },
                    ].map(({ label, sub, value, noColor }) => (
                      <div key={label} className="rounded-lg border border-gray-800 bg-gray-900 p-3">
                        <div className="text-xs text-gray-400 font-medium">{label}</div>
                        <div className="text-[10px] text-gray-600 mb-1.5">{sub}</div>
                        <div className={`text-xl font-bold ${noColor ? 'text-white' : retColor(value)}`}>
                          {value > 0 && !noColor ? '+' : ''}{value}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── 섹션 B: 내 투자 수익률 ── */}
                {analysis.personalReturn !== null && (
                  <div className="rounded-xl border border-indigo-800 bg-indigo-950/30 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">💼 내 투자 수익률</span>
                      <span className="text-[10px] bg-indigo-900/50 text-indigo-400 px-2 py-0.5 rounded-full">평단가 입력 기준</span>
                    </div>
                    <p className="text-[11px] text-indigo-400/70 -mt-1">
                      내가 실제로 산 가격 대비 현재가를 비교합니다.
                      <span className="text-yellow-600 ml-1">미국 주식 평단가는 달러($)로 입력하세요.</span>
                    </p>
                    <div className="flex items-baseline gap-3">
                      <span className={`text-3xl font-black ${retColor(analysis.personalReturn)}`}>
                        {analysis.personalReturn > 0 ? '+' : ''}{analysis.personalReturn}%
                      </span>
                      <span className="text-xs text-gray-500">평단가 입력된 종목 평균</span>
                    </div>
                    <div className="space-y-2 pt-1 border-t border-indigo-900/50">
                      {analysis.personalReturns.map((r: PersonalReturn) => (
                        <div key={r.ticker} className="flex items-center justify-between text-sm">
                          <span className="text-gray-400 font-semibold w-24 shrink-0 truncate">{tickerNameMap[r.ticker] || r.ticker}</span>
                          <div className="flex-1 mx-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${r.returnPct >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(Math.abs(r.returnPct), 100)}%` }}
                            />
                          </div>
                          <span className={`w-16 text-right font-semibold ${retColor(r.returnPct)}`}>
                            {r.returnPct > 0 ? '+' : ''}{r.returnPct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 섹터 비중 */}
                <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                  <div className="text-sm text-gray-400 mb-3">섹터 비중</div>
                  <div className="space-y-2">
                    {analysis.sectorExposure.map((s) => (
                      <div key={s.sector}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">{sectorLabel(s.sector)}</span>
                          <span className="text-white font-semibold">{Number(s.weight).toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full">
                          <div
                            className="h-1.5 bg-purple-500 rounded-full"
                            style={{ width: `${Math.min(s.weight, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 경고 */}
                <div className={`rounded-xl border p-4 ${
                  analysis.warnings.length === 0
                    ? 'border-green-800 bg-green-950/30'
                    : 'border-yellow-800 bg-yellow-950/30'
                }`}>
                  <div className="text-sm font-semibold mb-2">
                    {analysis.warnings.length === 0
                      ? '✅ 경고 없음'
                      : `⚠️ 경고 ${analysis.warnings.length}개`}
                  </div>
                  {analysis.warnings.length > 0 && (
                    <ul className="space-y-1">
                      {analysis.warnings.map((w, i) => (
                        <li key={i} className="text-sm text-yellow-300">• {w}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 인사이트 */}
                {analysis.insights.length > 0 && (
                  <div className="rounded-xl border border-purple-900 bg-purple-950/20 p-4">
                    <div className="text-sm font-semibold text-purple-300 mb-2">포트폴리오 인사이트</div>
                    <ul className="space-y-1.5">
                      {analysis.insights.map((ins, i) => (
                        <li key={i} className="text-sm text-gray-300 flex gap-2">
                          <span className="text-purple-400 shrink-0">•</span>
                          {ins}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 리밸런싱 힌트 */}
                {analysis.rebalanceHints.length > 0 && (
                  <div className="rounded-xl border border-orange-900 bg-orange-950/20 p-4">
                    <div className="text-sm font-semibold text-orange-300 mb-2">리밸런싱 제안</div>
                    <ul className="space-y-1.5">
                      {analysis.rebalanceHints.map((hint, i) => (
                        <li key={i} className="text-sm text-gray-300 flex gap-2">
                          <span className="text-orange-400 shrink-0">→</span>
                          {hint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 리밸런싱 가이드 */}
                {analysis.rebalanceResult && (
                  <div className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-4 space-y-4">

                    {/* 헤더 */}
                    <div className="text-sm font-bold text-emerald-300">🔄 리밸런싱 가이드</div>

                    {/* 한 줄 요약 */}
                    <p className="text-sm text-gray-200">{analysis.rebalanceResult.summary}</p>

                    {/* 지금 해야 할 행동 */}
                    {analysis.rebalanceResult.actions.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">지금 해야 할 행동</div>
                        {analysis.rebalanceResult.actions.map((action: RebalanceAction, i: number) => (
                          <div
                            key={action.ticker}
                            className={`flex items-center gap-3 rounded-lg px-3 py-3 border ${
                              action.type === 'reduce'
                                ? 'border-red-900/60 bg-red-950/25'
                                : 'border-emerald-900/60 bg-emerald-950/25'
                            }`}
                          >
                            {/* 번호 */}
                            <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              action.type === 'reduce' ? 'bg-red-900 text-red-300' : 'bg-emerald-900 text-emerald-300'
                            }`}>
                              {i + 1}
                            </div>
                            {/* 설명 */}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-white font-medium">
                                {action.text || (
                                  action.type === 'reduce'
                                    ? `${action.label || action.ticker} 비중을 ${action.from}% → ${action.to}%로 줄이기 (${action.delta}%)`
                                    : `${action.label || action.ticker} ${action.to}% ${action.from === 0 ? '추가하기' : `→ ${action.to}%로 늘리기`} (+${action.delta}%)`
                                )}
                              </span>
                              {action.from === 0 && (
                                <span className="ml-2 text-[10px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded align-middle">신규</span>
                              )}
                            </div>
                            {/* 화살표 표시 */}
                            <div className={`shrink-0 text-base font-bold ${action.type === 'reduce' ? 'text-red-400' : 'text-emerald-400'}`}>
                              {action.type === 'reduce' ? '↓' : '↑'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">현재 구성을 유지하세요.</p>
                    )}

                    {/* 개선 효과 */}
                    <div className="rounded-lg border border-gray-800 bg-gray-900/60 px-4 py-3">
                      <div className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">개선 효과</div>
                      <div className="text-sm text-white font-semibold">{analysis.rebalanceResult.beforeAfterSummary}</div>
                    </div>

                    {/* 왜 중요한가 */}
                    <div className="text-xs text-gray-500 leading-relaxed">
                      <span className="text-gray-400 font-semibold">💡 한 줄 요약  </span>
                      {analysis.rebalanceResult.whyItMatters}
                    </div>

                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}

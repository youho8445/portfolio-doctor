'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addPortfolioItem,
  analyzePortfolio,
  createPortfolio,
  deletePortfolio,
  getDataFreshness,
  getPortfolioItems,
  getPortfolios,
  getSecurities,
} from '@/lib/api';
import {
  AnalysisResult,
  PersonalReturn,
  Portfolio,
  PortfolioInputItem,
  SavedPortfolioItem,
  ScoreRule,
  Security,
} from '@/types';

type InputMode = 'amount' | 'weight';

export default function AnalyzerPage() {
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
  const [loadingPortfolioId, setLoadingPortfolioId] = useState<number | null>(null);
  const [deletingPortfolioId, setDeletingPortfolioId] = useState<number | null>(null);
  const [sidebarError, setSidebarError] = useState<string | null>(null);
  const [lastPriceDate, setLastPriceDate] = useState<string | null>(null);

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
    loadSavedPortfolios();
    getDataFreshness()
      .then((d) => setLastPriceDate(d.lastPriceDate))
      .catch(() => {});
  }, []);

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
      const portfolio = await createPortfolio(portfolioName);

      for (const item of items) {
        const avgCost = Number(item.avgCost) > 0 ? Number(item.avgCost) : undefined;
        const options =
          inputMode === 'amount'
            ? { amount: Number(item.amount), avgCost }
            : { weight: Number(item.weight), avgCost };
        await addPortfolioItem(portfolio.id, item.securityId, options);
      }

      const result = await analyzePortfolio(portfolio.id, '1Y', 'SP500');
      setAnalysis(result);
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
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="mx-auto max-w-screen-xl">

        {/* 헤더 */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Portfolio <span className="text-purple-400">Doctor</span>
            </h1>
            <p className="text-gray-400 mt-1">종목과 투자금액을 입력하고 포트폴리오를 분석하세요.</p>
          </div>
          {lastPriceDate && (
            <div className="shrink-0 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-right">
              <div className="text-xs text-gray-500">마지막 데이터 업데이트</div>
              <div className="text-sm font-semibold text-gray-300">{lastPriceDate}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_1fr] gap-6">

          {/* ── 저장된 포트폴리오 사이드바 ── */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 flex flex-col gap-3 h-fit">
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
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-6">

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
                      className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5"
                    >
                      {/* 종목명 */}
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-white text-sm">{item.ticker}</span>
                        <span className="text-gray-500 text-xs ml-1.5 truncate">
                          {item.displayNameKo ?? item.name}
                        </span>
                      </div>

                      {inputMode === 'amount' ? (
                        <>
                          {/* 금액 입력 */}
                          <input
                            type="number"
                            min={0}
                            value={item.amount || ''}
                            onChange={(e) => updateAmount(item.securityId, Number(e.target.value))}
                            className="w-28 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-right text-white text-sm outline-none focus:border-purple-500"
                            placeholder="투자금액"
                          />
                          {/* 자동 계산 비중 */}
                          <span className="text-xs text-gray-400 w-12 text-right shrink-0">
                            {getItemWeight(item).toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <>
                          {/* 비중 직접 입력 */}
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.weight || ''}
                            onChange={(e) => updateWeight(item.securityId, Number(e.target.value))}
                            className="w-20 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-center text-white text-sm outline-none focus:border-purple-500"
                            placeholder="0"
                          />
                          <span className="text-gray-500 text-sm shrink-0">%</span>
                        </>
                      )}
                      {/* 평단가 입력 (선택) */}
                      <input
                        type="number"
                        min={0}
                        value={item.avgCost || ''}
                        onChange={(e) => updateAvgCost(item.securityId, Number(e.target.value))}
                        className="w-24 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-right text-gray-300 text-sm outline-none focus:border-blue-500"
                        placeholder="평단가"
                      />

                      {/* 삭제 */}
                      <button
                        onClick={() => removeItem(item.securityId)}
                        className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none ml-1 shrink-0"
                      >
                        ×
                      </button>
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
              {loadingAnalyze ? '분석 중...' : 'Analyze Portfolio →'}
            </button>
          </div>

          {/* ── 결과 패널 ── */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-200">분석 결과</h2>

            {!analysis ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-600 border border-dashed border-gray-800 rounded-xl">
                <div className="text-5xl mb-3">📊</div>
                <p className="text-center">왼쪽에서 종목을 추가하고<br />분석을 실행하세요.</p>
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

                {/* 수익률 지표 */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: '포트폴리오 수익률', value: analysis.portfolioReturn },
                    { label: '벤치마크 수익률',   value: analysis.benchmarkReturn },
                    { label: '초과 수익률',        value: analysis.excessReturn },
                    { label: '상위 3종목 집중도',  value: analysis.top3Concentration, noColor: true },
                  ].map(({ label, value, noColor }) => (
                    <div key={label} className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                      <div className="text-xs text-gray-500 mb-1">{label}</div>
                      <div className={`text-2xl font-bold ${noColor ? 'text-white' : retColor(value)}`}>
                        {value > 0 && !noColor ? '+' : ''}{value}%
                      </div>
                    </div>
                  ))}
                </div>

                {/* 개인 수익률 (평단가 입력 시) */}
                {analysis.personalReturn !== null && (
                  <div className="rounded-xl border border-blue-900 bg-blue-950/30 p-4">
                    <div className="text-xs text-blue-400 mb-2 font-semibold">내 수익률 (평단가 기준)</div>
                    <div className="flex items-center gap-4 mb-3">
                      <span className={`text-3xl font-black ${retColor(analysis.personalReturn)}`}>
                        {analysis.personalReturn > 0 ? '+' : ''}{analysis.personalReturn}%
                      </span>
                      <span className="text-xs text-gray-500">평단가 입력된 종목 기준</span>
                    </div>
                    <div className="space-y-1">
                      {analysis.personalReturns.map((r: PersonalReturn) => (
                        <div key={r.ticker} className="flex items-center justify-between text-sm">
                          <span className="text-gray-400 font-semibold w-16">{r.ticker}</span>
                          <div className="flex-1 mx-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-1 rounded-full ${r.returnPct >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
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
                          <span className="text-gray-300">{s.sector}</span>
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

                {/* 리밸런싱 추천 엔진 */}
                {analysis.rebalanceResult && (
                  <div className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-4 space-y-4">
                    <div className="text-sm font-semibold text-emerald-300">리밸런싱 추천 엔진</div>

                    {/* 점수 변화 */}
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">현재 분산 점수</div>
                        <div className="text-2xl font-bold text-red-400">{analysis.rebalanceResult.currentScore}</div>
                      </div>
                      <div className="text-gray-500 text-xl">→</div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">개선 후 점수</div>
                        <div className="text-2xl font-bold text-emerald-400">{analysis.rebalanceResult.improvedScore}</div>
                      </div>
                      {analysis.rebalanceResult.improvedScore > analysis.rebalanceResult.currentScore && (
                        <div className="ml-2 text-xs bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded-full">
                          +{analysis.rebalanceResult.improvedScore - analysis.rebalanceResult.currentScore}점 향상
                        </div>
                      )}
                    </div>

                    {/* 추천 목록 */}
                    <ul className="space-y-1.5">
                      {analysis.rebalanceResult.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-gray-300 flex gap-2">
                          <span className="text-emerald-400 shrink-0">✓</span>
                          {rec}
                        </li>
                      ))}
                    </ul>

                    {/* Before / After 테이블 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-2 font-medium">현재 포트폴리오</div>
                        <div className="space-y-1">
                          {items.map((item) => (
                            <div key={item.ticker} className="flex justify-between text-xs text-gray-400">
                              <span>{item.ticker}</span>
                              <span>{item.weight.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-2 font-medium">제안 포트폴리오</div>
                        <div className="space-y-1">
                          {analysis.rebalanceResult.suggestedPortfolio.map((s) => (
                            <div key={s.ticker} className="flex justify-between items-center text-xs">
                              <span className={s.isNew ? 'text-emerald-400 font-semibold' : 'text-gray-400'}>
                                {s.ticker}
                                {s.isNew && (
                                  <span className="ml-1 bg-emerald-900/60 text-emerald-300 text-[10px] px-1 py-0.5 rounded">NEW</span>
                                )}
                              </span>
                              <span className={s.isNew ? 'text-emerald-400' : 'text-gray-400'}>{s.weight.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
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

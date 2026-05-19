'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAdminBillingMode,
  setAdminBillingMode,
  getPriceFetchStatus,
  runPriceFetch,
  PriceFetchStatus,
  getAdminUsers,
  changeAdminUserPassword,
  deleteAdminUser,
  grantAdminTrial,
  revokeAdminTrial,
  getAdminPageTrafficStats,
  getAdminFeedbackSummary,
  getContentRadarToday,
  refreshContentRadar,
  forceRefreshContentRadar,
  updateContentRadarStatus,
  AdminUser,
  AdminApiError,
  PageTrafficStats,
  FeedbackSummary,
  ContentRadarItem,
  ContentRadarResponse,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type BillingMode = 'FREE' | 'SOFT_PAYWALL' | 'PAID';

const MODES: { value: BillingMode; label: string; desc: string; color: string; dot: string }[] = [
  {
    value: 'FREE',
    label: '무료 오픈',
    desc: '모든 유저가 프리미엄 기능 무료 이용',
    color: 'border-emerald-600 bg-emerald-950/40',
    dot: 'bg-emerald-400',
  },
  {
    value: 'SOFT_PAYWALL',
    label: '소프트 페이월',
    desc: '페이월 UI 노출 (UX 테스트용) — 실제 결제 불필요',
    color: 'border-yellow-600 bg-yellow-950/40',
    dot: 'bg-yellow-400',
  },
  {
    value: 'PAID',
    label: '유료 모드',
    desc: '실제 결제 후에만 프리미엄 기능 이용 가능',
    color: 'border-purple-600 bg-purple-950/40',
    dot: 'bg-purple-400',
  },
];

function timeAgo(iso: string | null): string {
  if (!iso) return '-';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return new Date(iso).toLocaleString('ko-KR');
}

function StatusBadge({ status }: { status: PriceFetchStatus['status'] }) {
  const map = {
    idle:    { label: '대기 중',  bg: 'bg-gray-800',           text: 'text-gray-400' },
    running: { label: '수집 중…', bg: 'bg-blue-900/50',        text: 'text-blue-300' },
    done:    { label: '완료',     bg: 'bg-emerald-900/50',     text: 'text-emerald-300' },
    error:   { label: '오류',     bg: 'bg-red-900/50',         text: 'text-red-300' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
      )}
      {s.label}
    </span>
  );
}

function TrialBadge({ trialEndsAt }: { trialEndsAt: string | null }) {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);
  if (diffMs > 0) {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>
        체험 {diffDays}일 남음
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
      체험 만료
    </span>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading } = useAuth();

  // Billing mode
  const [mode, setMode] = useState<BillingMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [billingMsg, setBillingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Price fetch
  const [fetchStatus, setFetchStatus] = useState<PriceFetchStatus | null>(null);
  const [starting, setStarting] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Page traffic stats
  const [pageTraffic, setPageTraffic] = useState<PageTrafficStats | null>(null);

  // Feedback summary
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Content Radar
  const [contentRadar, setContentRadar] = useState<ContentRadarResponse | null>(null);
  const [contentRadarOpen, setContentRadarOpen] = useState(false);
  const [contentRadarRefreshing, setContentRadarRefreshing] = useState(false);
  const [contentRadarForceRefreshing, setContentRadarForceRefreshing] = useState(false);

  // Users
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [pwModal, setPwModal] = useState<{ id: number; email: string } | null>(null);
  const [newPw, setNewPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.replace('/login'); return; }
    // user가 로드됐지만 어드민이 아닌 경우 — 데이터 로드하지 않음
    if (user !== null && !user.isAdmin) return;
    // user가 아직 null이면(로딩 중) 대기
    if (user === null) return;

    getAdminBillingMode().then(setMode).catch(() => {
      setBillingMsg({ type: 'error', text: '관리자 권한이 없거나 서버 오류입니다.' });
    });

    loadFetchStatus();
    getAdminUsers().then(setUsers).catch(() => {});
    getAdminPageTrafficStats().then(setPageTraffic).catch(() => {});
    getAdminFeedbackSummary().then(setFeedbackSummary).catch(() => {});
    getContentRadarToday().then(setContentRadar).catch(() => {});
  }, [isLoading, isLoggedIn, user]);

  const loadFetchStatus = async () => {
    try {
      const s = await getPriceFetchStatus();
      setFetchStatus(s);
      // 수집 중이면 폴링 시작
      if (s.status === 'running') startPolling();
    } catch { /* ignore */ }
  };

  const startPolling = () => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const s = await getPriceFetchStatus();
        setFetchStatus(s);
        if (s.status !== 'running') stopPolling();
      } catch { stopPolling(); }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  useEffect(() => () => stopPolling(), []);

  const handleSetMode = async (newMode: BillingMode) => {
    if (saving || newMode === mode) return;
    try {
      setSaving(true); setBillingMsg(null);
      await setAdminBillingMode(newMode);
      setMode(newMode);
      setBillingMsg({ type: 'success', text: `Billing mode → ${newMode} 변경 완료` });
    } catch (e: unknown) {
      const status = e instanceof AdminApiError ? e.status : undefined;
      const text =
        status === 401 ? '로그인이 만료되었습니다. 다시 로그인해주세요.' :
        status === 403 ? '관리자 권한이 없습니다. ADMIN_EMAILS 설정을 확인하세요.' :
        status === 500 ? '서버 오류로 변경에 실패했습니다.' :
        status !== undefined ? `변경 실패: HTTP ${status}` :
        '변경 실패. 네트워크를 확인해주세요.';
      setBillingMsg({ type: 'error', text });
    } finally { setSaving(false); }
  };

  const handleRunFetch = async () => {
    if (starting || fetchStatus?.status === 'running') return;
    try {
      setStarting(true); setFetchMsg(null);
      await runPriceFetch();
      setFetchMsg('수집을 시작했습니다. 완료까지 수 분이 걸릴 수 있습니다.');
      await loadFetchStatus();
      startPolling();
    } catch {
      setFetchMsg('수집 시작에 실패했습니다.');
    } finally { setStarting(false); }
  };

  const handleChangePassword = async () => {
    if (!pwModal || !newPw.trim()) return;
    try {
      setPwSaving(true); setPwMsg(null);
      await changeAdminUserPassword(pwModal.id, newPw);
      setPwMsg({ type: 'success', text: '비밀번호가 변경되었습니다.' });
      setNewPw('');
    } catch {
      setPwMsg({ type: 'error', text: '변경에 실패했습니다.' });
    } finally { setPwSaving(false); }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await deleteAdminUser(id);
      setUsers((prev) => prev?.filter((u) => u.id !== id) ?? null);
      setDeleteConfirm(null);
    } catch { /* ignore */ }
  };

  const handleContentRadarRefresh = async () => {
    if (contentRadarRefreshing) return;
    setContentRadarRefreshing(true);
    try {
      await refreshContentRadar();
      // Re-fetch after short delay to pick up newly saved items
      await new Promise((r) => setTimeout(r, 3000));
      const data = await getContentRadarToday();
      setContentRadar(data);
    } catch { /* ignore */ } finally {
      setContentRadarRefreshing(false);
    }
  };

  const handleContentRadarForceRefresh = async () => {
    if (contentRadarForceRefreshing) return;
    setContentRadarForceRefreshing(true);
    try {
      await forceRefreshContentRadar();
      // Wait longer since existing items are deleted and regenerated
      await new Promise((r) => setTimeout(r, 5000));
      const data = await getContentRadarToday();
      setContentRadar(data);
    } catch { /* ignore */ } finally {
      setContentRadarForceRefreshing(false);
    }
  };

  const handleContentRadarStatus = async (id: number, status: ContentRadarItem['status']) => {
    try {
      const updated = await updateContentRadarStatus(id, status);
      setContentRadar((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
        };
      });
    } catch { /* ignore */ }
  };

  if (isLoading || (isLoggedIn && user === null)) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#141418' }}>
        <div className="text-sm" style={{ color: '#4b5563' }}>로딩 중...</div>
      </main>
    );
  }

  if (!isLoggedIn || (user !== null && !user.isAdmin)) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#141418' }}>
        <div className="text-center space-y-3">
          <div className="text-3xl">🔒</div>
          <div className="text-base font-semibold text-white">관리자 권한이 없습니다</div>
          <div className="text-sm" style={{ color: '#6b7280' }}>
            이 페이지는 관리자만 접근할 수 있습니다.
          </div>
          <button
            onClick={() => router.replace('/analyzer')}
            className="mt-2 text-sm px-4 py-2 rounded-xl"
            style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}
          >
            분석 페이지로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  if (mode === null) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#141418' }}>
        <div className="text-sm" style={{ color: '#4b5563' }}>설정 불러오는 중...</div>
      </main>
    );
  }

  const isRunning = fetchStatus?.status === 'running';

  return (
    <main className="min-h-screen text-white px-4 py-10" style={{ background: '#141418' }}>
      <div className="max-w-xl mx-auto space-y-6">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-black text-white" style={{ letterSpacing: '-0.5px' }}>관리자 설정</h1>
          <p className="text-sm mt-1" style={{ color: '#4b5563' }}>{user?.email}</p>
        </div>

        {/* ── Billing Mode ── */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>Billing Mode</h2>
            <p className="text-sm text-white font-bold mt-0.5">결제 모드 설정</p>
          </div>

          <div className="space-y-2">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => handleSetMode(m.value)}
                disabled={saving}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all disabled:opacity-50 ${
                  mode === m.value ? m.color : 'border-gray-800 bg-gray-950/60 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${m.dot}`} />
                    <div>
                      <div className="font-bold text-sm text-white">{m.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{m.desc}</div>
                    </div>
                  </div>
                  {mode === m.value && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', color: '#d1d5db' }}>현재</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {billingMsg && (
            <div className={`rounded-xl px-3 py-2 text-xs font-medium ${
              billingMsg.type === 'success'
                ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300'
                : 'bg-red-950/50 border border-red-800 text-red-300'
            }`}>
              {billingMsg.text}
            </div>
          )}
        </div>

        {/* ── 가격 데이터 수집 ── */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>Price Data Sync</h2>
              <p className="text-sm text-white font-bold mt-0.5">주가 데이터 수집</p>
              <p className="text-xs mt-1" style={{ color: '#4b5563' }}>
                평일 오후 5시(KST)에 자동 실행 · Yahoo Finance 기준 1년치
              </p>
            </div>
            {fetchStatus && <StatusBadge status={fetchStatus.status} />}
          </div>

          {/* 마지막 실행 결과 */}
          {fetchStatus && fetchStatus.status !== 'idle' && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#141418', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#4b5563' }}>시작</div>
                  <div className="text-xs text-white">{timeAgo(fetchStatus.startedAt)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#4b5563' }}>완료</div>
                  <div className="text-xs text-white">{fetchStatus.finishedAt ? timeAgo(fetchStatus.finishedAt) : (isRunning ? '진행 중…' : '-')}</div>
                </div>
              </div>

              {(fetchStatus.status === 'done' || fetchStatus.status === 'running') && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '성공', value: fetchStatus.success, color: '#10b981' },
                    { label: '실패', value: fetchStatus.failed, color: fetchStatus.failed > 0 ? '#ef4444' : '#4b5563' },
                    { label: '저장 건수', value: fetchStatus.totalRows.toLocaleString(), color: '#8b5cf6' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#4b5563' }}>{label}</div>
                      <div className="text-base font-black" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}

              {fetchStatus.failed > 0 && fetchStatus.failedTickers.length > 0 && (
                <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#ef4444' }}>실패 종목</div>
                  <div className="text-xs" style={{ color: '#fca5a5' }}>{fetchStatus.failedTickers.join(', ')}</div>
                </div>
              )}

              {fetchStatus.status === 'error' && fetchStatus.errorMessage && (
                <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="text-xs" style={{ color: '#fca5a5' }}>{fetchStatus.errorMessage}</div>
                </div>
              )}
            </div>
          )}

          {fetchMsg && (
            <div className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#c4b5fd' }}>
              {fetchMsg}
            </div>
          )}

          <button
            onClick={handleRunFetch}
            disabled={starting || isRunning}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: isRunning ? '#1f2937' : 'linear-gradient(135deg,#7c3aed,#9333ea)' }}
          >
            {isRunning ? (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block" />
                수집 중... (자동 갱신)
              </>
            ) : (
              '지금 즉시 업데이트'
            )}
          </button>

          <p className="text-[10px] text-center" style={{ color: '#374151' }}>
            자동 스케줄: 매주 월~금 오후 5시(KST) · 주말·공휴일 자동 스킵
          </p>
        </div>

        {/* ── 페이지 접근 통계 ── */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>Page Traffic</h2>
            <p className="text-sm text-white font-bold mt-0.5">페이지 접근 통계</p>
          </div>

          {pageTraffic === null ? (
            <div className="text-xs" style={{ color: '#4b5563' }}>불러오는 중...</div>
          ) : (
            <>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <th className="text-left px-4 py-2.5 font-semibold" style={{ color: '#6b7280' }}>단계</th>
                      <th className="text-right px-4 py-2.5 font-semibold" style={{ color: '#6b7280' }}>전체</th>
                      <th className="text-right px-4 py-2.5 font-semibold" style={{ color: '#6b7280' }}>7일</th>
                      <th className="text-right px-4 py-2.5 font-semibold" style={{ color: '#a78bfa' }}>오늘</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { event: 'page_view_landing',  label: '① 랜딩 페이지 접근' },
                      { event: 'page_view_analyzer', label: '② 분석 페이지 접근' },
                      { event: 'analysis_run',        label: '③ 포트폴리오 분석 실행' },
                      { event: 'checkout_page_view',  label: '④ 결제 페이지 진입' },
                      { event: 'payment_success',     label: '⑤ 결제 완료' },
                    ].map(({ event, label }) => {
                      const allRow   = pageTraffic.allTime.find((r) => r.event === event);
                      const d7Row    = pageTraffic.last7d.find((r) => r.event === event);
                      const todayRow = pageTraffic.today.find((r) => r.event === event);
                      return (
                        <tr key={event} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="px-4 py-2.5" style={{ color: '#9ca3af' }}>{label}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-white">{(allRow?.count ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right" style={{ color: '#6b7280' }}>{(d7Row?.count ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right font-semibold" style={{ color: '#a78bfa' }}>{(todayRow?.count ?? 0).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pageTraffic.landingSources.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>랜딩 유입 출처</div>
                  <div className="flex flex-wrap gap-2">
                    {pageTraffic.landingSources.map(({ source, count }) => (
                      <div key={source} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <span style={{ color: '#9ca3af' }}>{source}</span>
                        <span className="font-semibold text-white">{count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── 유저 관리 ── */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>User Management</h2>
              <p className="text-sm text-white font-bold mt-0.5">
                유저 관리
                {users && <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>{users.length}명</span>}
              </p>
            </div>
          </div>

          {/* 검색 */}
          {users && users.length > 0 && (
            <input
              type="text"
              placeholder="이름 또는 이메일 검색"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
              style={{ background: '#141418', border: '1.5px solid rgba(255,255,255,0.08)' }}
            />
          )}

          {users === null ? (
            <div className="text-xs" style={{ color: '#4b5563' }}>불러오는 중...</div>
          ) : users.length === 0 ? (
            <div className="text-xs" style={{ color: '#4b5563' }}>가입된 유저가 없습니다.</div>
          ) : (() => {
            const q = userSearch.trim().toLowerCase();
            const filtered = q
              ? users.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
              : users;
            return (
              <div className="space-y-2">
                {filtered.length === 0 && (
                  <div className="text-xs" style={{ color: '#4b5563' }}>검색 결과가 없습니다.</div>
                )}
                {filtered.map((u) => {
                  const trialActive = u.trialEndsAt != null && new Date(u.trialEndsAt) > new Date();
                  return (
                    <div key={u.id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-3" style={{ background: '#141418', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-semibold text-white truncate">{u.name}</div>
                          <TrialBadge trialEndsAt={u.trialEndsAt} />
                        </div>
                        <div className="text-xs truncate mt-0.5" style={{ color: '#6b7280' }}>{u.email}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: '#374151' }}>
                          가입: {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => { setPwModal({ id: u.id, email: u.email }); setPwMsg(null); setNewPw(''); }}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                          style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}
                        >
                          비밀번호
                        </button>
                        {trialActive ? (
                          <button
                            onClick={() => revokeAdminTrial(u.id).then(() => getAdminUsers().then(setUsers)).catch(() => {})}
                            className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}
                            title="체험 해제"
                          >
                            체험 해제
                          </button>
                        ) : (
                          <button
                            onClick={() => grantAdminTrial(u.id, 30).then(() => getAdminUsers().then(setUsers)).catch(() => {})}
                            className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }}
                            title="30일 무료 체험 부여"
                          >
                            체험 부여
                          </button>
                        )}
                        {deleteConfirm === u.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDeleteUser(u.id)} className="text-xs px-2 py-1.5 rounded-lg font-medium" style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>확인</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1.5 rounded-lg font-medium" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>취소</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(u.id)} className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>삭제</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* 비밀번호 변경 모달 */}
        {pwModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="rounded-2xl p-6 w-full max-w-sm space-y-4" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <h3 className="text-base font-bold text-white">비밀번호 변경</h3>
                <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{pwModal.email}</p>
              </div>
              <input
                type="password"
                placeholder="새 비밀번호"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                style={{ background: '#141418', border: '1.5px solid rgba(255,255,255,0.08)' }}
              />
              {pwMsg && (
                <div className={`text-xs px-3 py-2 rounded-lg ${pwMsg.type === 'success' ? 'bg-emerald-950/50 text-emerald-300' : 'bg-red-950/50 text-red-300'}`}>
                  {pwMsg.text}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleChangePassword}
                  disabled={pwSaving || !newPw.trim()}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}
                >
                  {pwSaving ? '변경 중...' : '변경'}
                </button>
                <button
                  onClick={() => { setPwModal(null); setPwMsg(null); setNewPw(''); }}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 피드백 ── */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setFeedbackOpen((v) => !v)}
          >
            <div className="text-left">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>Feedback</h2>
              <p className="text-sm text-white font-bold mt-0.5">
                유저 피드백
                {feedbackSummary && (
                  <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>
                    {feedbackSummary.total}건
                  </span>
                )}
              </p>
            </div>
            <span className="text-xs" style={{ color: '#6b7280' }}>{feedbackOpen ? '▲' : '▼'}</span>
          </button>

          {feedbackOpen && (
            <>
              {feedbackSummary === null ? (
                <div className="text-xs" style={{ color: '#4b5563' }}>불러오는 중...</div>
              ) : feedbackSummary.total === 0 ? (
                <div className="text-xs" style={{ color: '#4b5563' }}>아직 피드백이 없습니다.</div>
              ) : (
                <div className="space-y-5">

                  {/* 요약 행 */}
                  <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: '#9ca3af' }}>
                    <span>총 <strong className="text-white">{feedbackSummary.total}건</strong></span>
                    <span style={{ color: '#374151' }}>|</span>
                    <span>게스트 <strong className="text-white">{feedbackSummary.guestVsLoggedIn.guest}</strong></span>
                    <span>로그인 <strong className="text-white">{feedbackSummary.guestVsLoggedIn.loggedIn}</strong></span>
                    {feedbackSummary.avgHealthScore !== null && (
                      <>
                        <span style={{ color: '#374151' }}>|</span>
                        <span>평균 건강점수 <strong className="text-white">{feedbackSummary.avgHealthScore}</strong></span>
                      </>
                    )}
                  </div>

                  {/* 평점 바 */}
                  <div className="space-y-2">
                    {[
                      { key: 'helpful' as const, label: '👍 도움 됐어요', color: '#10b981' },
                      { key: 'unclear' as const, label: '🤔 애매해요', color: '#f59e0b' },
                      { key: 'not_helpful' as const, label: '👎 도움 안 됐어요', color: '#ef4444' },
                    ].map(({ key, label, color }) => {
                      const count = feedbackSummary.byRating[key];
                      const pct = feedbackSummary.percentages[key];
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span style={{ color: '#e5e7eb' }}>{label}</span>
                            <span style={{ color: '#9ca3af' }}>{count}건 ({pct}%)</span>
                          </div>
                          <div className="w-full rounded-full h-1.5" style={{ background: '#2d2d3a' }}>
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 주요 이유 */}
                  {feedbackSummary.topReasons.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>주요 이유 (상위 {Math.min(feedbackSummary.topReasons.length, 5)}개)</div>
                      <div className="space-y-1">
                        {feedbackSummary.topReasons.slice(0, 5).map(({ reason, count }) => (
                          <div key={reason} className="flex items-center justify-between text-xs rounded-lg px-3 py-2" style={{ background: '#141418' }}>
                            <span style={{ color: '#d1d5db' }}>{reason}</span>
                            <span className="font-semibold" style={{ color: '#a78bfa' }}>{count}건</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 최근 자유 의견 */}
                  {feedbackSummary.recentMessages.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>최근 자유 의견</div>
                      <div className="space-y-2">
                        {feedbackSummary.recentMessages.slice(0, 5).map((m) => {
                          const emoji = m.rating === 'helpful' ? '👍' : m.rating === 'unclear' ? '🤔' : '👎';
                          return (
                            <div key={m.id} className="rounded-xl px-4 py-3" style={{ background: '#141418', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div className="text-xs mb-1.5" style={{ color: '#e5e7eb' }}>
                                {emoji} &ldquo;{m.message}&rdquo;
                              </div>
                              <div className="flex gap-2 text-[10px]" style={{ color: '#4b5563' }}>
                                {m.healthScore !== null && <span>건강점수 {m.healthScore}</span>}
                                <span>{m.isGuest ? '게스트' : '로그인'}</span>
                                <span>{timeAgo(m.createdAt)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </>
          )}
        </div>

        {/* ── Content Radar ── */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <button
              className="flex-1 flex items-center justify-between text-left"
              onClick={() => setContentRadarOpen((v) => !v)}
            >
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>Content Radar</h2>
                <p className="text-sm text-white font-bold mt-0.5">
                  포밸런스 브리핑 소재
                  {contentRadar && contentRadar.count > 0 && (
                    <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>
                      {contentRadar.count}건
                    </span>
                  )}
                </p>
                {contentRadar?.refreshedAt && (
                  <p className="text-[10px] mt-0.5" style={{ color: '#374151' }}>마지막 업데이트: {timeAgo(contentRadar.refreshedAt)}</p>
                )}
              </div>
              <span className="text-xs ml-3 shrink-0" style={{ color: '#6b7280' }}>{contentRadarOpen ? '▲' : '▼'}</span>
            </button>
            {contentRadarOpen && (
              <div className="flex gap-2 ml-3 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); void handleContentRadarRefresh(); }}
                  disabled={contentRadarRefreshing}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                  style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}
                >
                  {contentRadarRefreshing ? '수집 중…' : '새로고침'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); void handleContentRadarForceRefresh(); }}
                  disabled={contentRadarForceRefreshing}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  {contentRadarForceRefreshing ? '재생성 중…' : '스크립트 재생성'}
                </button>
              </div>
            )}
          </div>

          {contentRadarOpen && (
            <>
              {contentRadar === null ? (
                <div className="text-xs" style={{ color: '#4b5563' }}>불러오는 중...</div>
              ) : contentRadar.count === 0 ? (
                <div className="rounded-xl p-5 text-center space-y-2" style={{ background: '#141418', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="text-2xl">📡</div>
                  <div className="text-sm font-semibold text-white">오늘의 소재가 아직 없습니다</div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>매일 오전 6시(KST)에 자동 수집됩니다.</div>
                  <button
                    onClick={() => void handleContentRadarRefresh()}
                    disabled={contentRadarRefreshing}
                    className="mt-1 text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                    style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}
                  >
                    {contentRadarRefreshing ? '수집 중…' : '지금 수집하기'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {contentRadar.items
                    .filter((item) => item.status !== 'ignored')
                    .map((item) => {
                      const scoreBg = item.contentScore >= 80 ? '#052e16' : item.contentScore >= 60 ? '#1c1700' : '#1c0505';
                      const scoreColor = item.contentScore >= 80 ? '#4ade80' : item.contentScore >= 60 ? '#fbbf24' : '#f87171';
                      const marketEmoji = item.market === 'KR' ? '🇰🇷' : item.market === 'US' ? '🇺🇸' : '🌐';
                      const isUsed = item.status === 'used';
                      const copyBtn = (text: string, label: string) => (
                        <button
                          onClick={() => navigator.clipboard.writeText(text).catch(() => {})}
                          className="text-[10px] px-2 py-0.5 rounded-md shrink-0"
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          📋 {label}
                        </button>
                      );
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl p-4 space-y-3"
                          style={{
                            background: '#141418',
                            border: '1px solid rgba(255,255,255,0.06)',
                            opacity: isUsed ? 0.5 : 1,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          {/* Header row: score badge + badges */}
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="text-xs font-black px-2 py-0.5 rounded-md shrink-0" style={{ background: scoreBg, color: scoreColor, border: `1px solid ${scoreColor}33` }}>
                              {item.contentScore}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-md shrink-0" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                              {marketEmoji} {item.market}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-md shrink-0" style={{ background: 'rgba(124,58,237,0.1)', color: '#c4b5fd' }}>
                              {item.contentType}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-md shrink-0" style={{ background: 'rgba(255,255,255,0.04)', color: '#6b7280' }}>
                              {item.category}
                            </span>
                            {item.selectionReason && (
                              <span className="text-xs px-2 py-0.5 rounded-md shrink-0" style={{ background: 'rgba(20,184,166,0.12)', color: '#2dd4bf', border: '1px solid rgba(20,184,166,0.2)' }}>
                                {item.selectionReason}
                              </span>
                            )}
                            {isUsed && (
                              <span className="text-xs px-2 py-0.5 rounded-md ml-auto shrink-0" style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7' }}>
                                ✓ 사용됨
                              </span>
                            )}
                          </div>

                          {/* Score breakdown */}
                          <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: '#4b5563' }}>
                            <span style={{ color: '#818cf8' }}>T{item.scoreTrend ?? 0}</span>
                            <span>+</span>
                            <span style={{ color: '#34d399' }}>R{item.scoreRelevance ?? 0}</span>
                            <span>+</span>
                            <span style={{ color: '#fbbf24' }}>B{item.scoreBeginner ?? 0}</span>
                            <span>+</span>
                            <span style={{ color: '#60a5fa' }}>S{item.scoreSource ?? 0}</span>
                            <span>-</span>
                            <span style={{ color: '#f87171' }}>P{item.scorePenalty ?? 0}</span>
                            <span>=</span>
                            <span style={{ color: scoreColor, fontWeight: 700 }}>{item.contentScore}</span>
                          </div>

                          {/* Title + source */}
                          <div>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-semibold leading-snug hover:underline"
                              style={{ color: '#e5e7eb' }}
                            >
                              {item.title} ↗
                            </a>
                            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
                              {item.source}
                              {item.publishedAt && <span> · {timeAgo(item.publishedAt)}</span>}
                            </div>
                          </div>

                          {/* Related tickers */}
                          {item.relatedTickers && item.relatedTickers.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap">
                              {item.relatedTickers.map((t) => (
                                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* News summary */}
                          {item.shortNewsSummary && (
                            <div>
                              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#4b5563' }}>📝 News Summary</div>
                              <div className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>{item.shortNewsSummary}</div>
                            </div>
                          )}

                          {/* Portfolio impact */}
                          <div>
                            <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#4b5563' }}>🎯 Portfolio Impact</div>
                            <div className="text-xs leading-relaxed" style={{ color: '#d1d5db' }}>{item.whyItMattersToPortfolio}</div>
                          </div>

                          {/* Beginner caution */}
                          {item.beginnerCaution && (
                            <div>
                              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#4b5563' }}>⚠️ Beginner Caution</div>
                              <div className="text-xs leading-relaxed" style={{ color: '#fbbf24' }}>{item.beginnerCaution}</div>
                            </div>
                          )}

                          {/* Opening hook */}
                          <div>
                            <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#4b5563' }}>⚡ Opening Hook</div>
                            <div className="text-xs font-medium italic leading-relaxed" style={{ color: '#c4b5fd' }}>{item.openingHook}</div>
                          </div>

                          {/* 15s script */}
                          {item.script15s && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-[10px] uppercase tracking-widest" style={{ color: '#4b5563' }}>🎬 15s Script</div>
                                {copyBtn(item.script15s, '복사')}
                              </div>
                              <pre className="text-xs leading-relaxed rounded-lg p-3" style={{ background: 'rgba(129,140,248,0.05)', border: '1px solid rgba(129,140,248,0.15)', color: '#e5e7eb', fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {item.script15s}
                              </pre>
                            </div>
                          )}

                          {/* 30s script */}
                          {item.script30s && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-[10px] uppercase tracking-widest" style={{ color: '#4b5563' }}>🎬 30s Script</div>
                                {copyBtn(item.script30s, '복사')}
                              </div>
                              <pre className="text-xs leading-relaxed rounded-lg p-3" style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.12)', color: '#e5e7eb', fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {item.script30s}
                              </pre>
                            </div>
                          )}

                          {/* Subtitle lines */}
                          {item.subtitleLines && item.subtitleLines.length > 0 && (
                            <div>
                              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: '#4b5563' }}>🖼 Subtitle Lines</div>
                              <div className="space-y-1">
                                {item.subtitleLines.map((line, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="text-[10px] w-4 text-right shrink-0" style={{ color: '#374151' }}>{i + 1}</span>
                                    <span className="text-xs" style={{ color: '#d1d5db' }}>{line}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Caption */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-[10px] uppercase tracking-widest" style={{ color: '#4b5563' }}>📱 Caption</div>
                              {copyBtn(item.captionDraft, '복사')}
                            </div>
                            <pre className="text-xs leading-relaxed rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#e5e7eb', fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {item.captionDraft}
                            </pre>
                          </div>

                          {/* Hashtags */}
                          {item.hashtags && item.hashtags.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs" style={{ color: '#8b5cf6' }}>{item.hashtags.join(' ')}</span>
                              {copyBtn(item.hashtags.join(' '), '복사')}
                            </div>
                          )}

                          {/* Glossary + CTA */}
                          <div className="space-y-1.5">
                            {item.relatedGlossaryTerms && item.relatedGlossaryTerms.length > 0 && (
                              <div className="text-xs" style={{ color: '#6b7280' }}>
                                🏷️ {item.relatedGlossaryTerms.join(' · ')}
                              </div>
                            )}
                            {item.ctaText && (
                              <div className="text-xs" style={{ color: '#a78bfa' }}>
                                📣 {item.ctaText}
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 pt-1 flex-wrap">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-3 py-1.5 rounded-lg font-medium"
                              style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
                            >
                              원문 보기 ↗
                            </a>
                            {isUsed ? (
                              <button
                                onClick={() => void handleContentRadarStatus(item.id, 'new')}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                                style={{ background: 'rgba(255,255,255,0.04)', color: '#4b5563', border: '1px solid rgba(255,255,255,0.06)' }}
                              >
                                되돌리기
                              </button>
                            ) : (
                              <button
                                onClick={() => void handleContentRadarStatus(item.id, 'used')}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                                style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }}
                              >
                                ✓ 사용 완료
                              </button>
                            )}
                            <button
                              onClick={() => void handleContentRadarStatus(item.id, 'ignored')}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium"
                              style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}
                            >
                              ✕ 숨기기
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>

        <button
          onClick={() => router.push('/analyzer')}
          className="text-sm transition-colors"
          style={{ color: '#374151' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#374151')}
        >
          ← 분석 페이지로 돌아가기
        </button>
      </div>
    </main>
  );
}

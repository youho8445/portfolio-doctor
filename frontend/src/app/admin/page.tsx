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
  AdminUser,
  AdminApiError,
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
                            onClick={() => grantAdminTrial(u.id, 7).then(() => getAdminUsers().then(setUsers)).catch(() => {})}
                            className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }}
                            title="7일 무료 체험 부여"
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

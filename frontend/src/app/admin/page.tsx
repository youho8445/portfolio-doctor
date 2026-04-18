'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminBillingMode, setAdminBillingMode } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type BillingMode = 'FREE' | 'SOFT_PAYWALL' | 'PAID';

const MODES: { value: BillingMode; label: string; desc: string; color: string }[] = [
  {
    value: 'FREE',
    label: '무료 오픈',
    desc: '모든 유저가 프리미엄 기능 무료 이용',
    color: 'border-emerald-600 bg-emerald-950/40 text-emerald-300',
  },
  {
    value: 'SOFT_PAYWALL',
    label: '소프트 페이월',
    desc: '페이월 UI 노출 (UX 테스트용) — 실제 결제 불필요',
    color: 'border-yellow-600 bg-yellow-950/40 text-yellow-300',
  },
  {
    value: 'PAID',
    label: '유료 모드',
    desc: '실제 결제 후에만 프리미엄 기능 이용 가능',
    color: 'border-purple-600 bg-purple-950/40 text-purple-300',
  },
];

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading } = useAuth();
  const [mode, setMode] = useState<BillingMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    getAdminBillingMode()
      .then(setMode)
      .catch(() => {
        setMessage({ type: 'error', text: '관리자 권한이 없거나 서버 오류입니다.' });
      });
  }, [isLoading, isLoggedIn]);

  const handleSet = async (newMode: BillingMode) => {
    if (saving || newMode === mode) return;
    try {
      setSaving(true);
      setMessage(null);
      await setAdminBillingMode(newMode);
      setMode(newMode);
      setMessage({ type: 'success', text: `billing mode → ${newMode} 변경 완료` });
    } catch {
      setMessage({ type: 'error', text: '변경 실패. 관리자 계정으로 로그인했는지 확인하세요.' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || mode === null) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">로딩 중...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-lg mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-white">관리자 설정</h1>
          <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Billing Mode</h2>

          <div className="space-y-3">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => handleSet(m.value)}
                disabled={saving}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all disabled:opacity-50 ${
                  mode === m.value
                    ? m.color
                    : 'border-gray-700 bg-gray-950 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm">{m.label}</div>
                    <div className="text-xs mt-0.5 opacity-70">{m.desc}</div>
                  </div>
                  {mode === m.value && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10">현재</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {message && (
            <div className={`rounded-lg px-3 py-2 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-950/50 border border-emerald-700 text-emerald-300'
                : 'bg-red-950/50 border border-red-700 text-red-300'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        <button
          onClick={() => router.push('/analyzer')}
          className="text-sm text-gray-600 hover:text-gray-400 transition-colors"
        >
          ← 분석 페이지로 돌아가기
        </button>
      </div>
    </main>
  );
}

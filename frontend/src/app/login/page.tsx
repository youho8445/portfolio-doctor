'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? '로그인 실패');
      login(data.access_token, data.user);
      router.push('/analyzer');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '로그인 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #f3f0ff 40%, #e8e4f8 100%)' }}
    >
      {/* 배경 그리드 패턴 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.06) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* 카드 */}
      <div
        className="relative w-full max-w-sm rounded-3xl p-8 shadow-2xl"
        style={{ background: '#ffffff', boxShadow: '0 8px 40px rgba(124,58,237,0.12)' }}
      >
        {/* 로고 */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5" style={{ width: 18, height: 18 }}>
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <span className="font-semibold text-base" style={{ color: '#1a1d2e' }}>Portfolio Doctor</span>
        </div>

        {/* 타이틀 */}
        <div className="mb-7">
          <h1 className="font-bold mb-2" style={{ fontSize: 30, letterSpacing: '-0.5px', color: '#1a1d2e' }}>환영합니다</h1>
          <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
            내 투자 포트폴리오를 진단하고<br />최적의 전략을 찾아보세요.
          </p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이메일 */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 tracking-widest" style={{ color: '#9ca3af' }}>
              이메일 주소
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{ background: '#f8fafc', border: '1.5px solid transparent' }}
              onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
              onBlur={(e) => (e.target.style.borderColor = 'transparent')}
              placeholder=""
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold tracking-widest" style={{ color: '#64748b' }}>
                비밀번호
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-all"
                style={{ background: '#f8fafc', border: '1.5px solid transparent' }}
                onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
                onBlur={(e) => (e.target.style.borderColor = 'transparent')}
                placeholder=""
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity"
                style={{ color: '#6b7280' }}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* 에러 */}
          {error && (
            <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626' }}>
              {error}
            </div>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', marginTop: 8 }}
          >
            {loading ? '로그인 중...' : (<>로그인 <span style={{ fontSize: 16 }}>→</span></>)}
          </button>
        </form>

        {/* 소셜 로그인 */}
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: '#e8ecf4' }} />
            <span className="text-xs tracking-widest font-semibold" style={{ color: '#6b7280' }}>또는</span>
            <div className="flex-1 h-px" style={{ background: '#e8ecf4' }} />
          </div>
          <button
            type="button"
            onClick={() => { window.location.href = `${API}/auth/google`; }}
            className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2.5 transition-opacity hover:opacity-80"
            style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#1c1c1e' }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 계속하기
          </button>
        </div>

        {/* 회원가입 */}
        <p className="text-center text-xs mt-6" style={{ color: '#6b7280' }}>
          계정이 없으신가요?{' '}
          <Link href="/register" className="font-semibold" style={{ color: '#a78bfa' }}>
            회원가입
          </Link>
        </p>
      </div>

      {/* 하단 푸터 */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-between px-8">
        <div className="flex gap-4 text-xs" style={{ color: '#9ca3af' }}>
          <span className="cursor-pointer hover:text-gray-600 transition-colors">이용약관</span>
          <span className="cursor-pointer hover:text-gray-600 transition-colors">개인정보처리방침</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#7c3aed' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
          보안 연결
        </div>
      </div>
    </main>
  );
}

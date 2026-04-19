'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState('');
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
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? '회원가입 실패');
      login(data.access_token, data.user);
      router.push('/analyzer');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '회원가입 실패');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: '#38383f',
    border: '1.5px solid transparent',
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #f3f0ff 40%, #e8e4f8 100%)' }}
    >
      {/* 배경 그리드 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.06) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div
        className="relative w-full max-w-sm rounded-3xl p-8 shadow-2xl"
        style={{ background: '#46464e' }}
      >
        {/* 로고 */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-base">Portfolio Doctor</span>
        </div>

        {/* 타이틀 */}
        <div className="mb-7">
          <h1 className="text-white font-bold mb-2" style={{ fontSize: 30, letterSpacing: '-0.5px' }}>계정 만들기</h1>
          <p className="text-sm leading-relaxed" style={{ color: '#b0afc0' }}>
            무료로 시작해서 포트폴리오를<br />진단해보세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이름 */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 tracking-widest" style={{ color: '#9ca3af' }}>
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
              onBlur={(e) => (e.target.style.borderColor = 'transparent')}
              placeholder=""
            />
          </div>

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
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
              style={{ ...inputStyle }}
              onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
              onBlur={(e) => (e.target.style.borderColor = 'transparent')}
              placeholder=""
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 tracking-widest" style={{ color: '#9ca3af' }}>
              비밀번호 (6자 이상)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white outline-none transition-all"
                style={{ ...inputStyle }}
                onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
                onBlur={(e) => (e.target.style.borderColor = 'transparent')}
                placeholder=""
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2"
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
            <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          {/* 회원가입 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', marginTop: 8 }}
          >
            {loading ? '가입 중...' : (<>계정 만들기 <span style={{ fontSize: 16 }}>→</span></>)}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: '#6b7280' }}>
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-semibold" style={{ color: '#a78bfa' }}>
            로그인
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

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
    text: '건강 점수 진단',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>
    ),
    text: '리밸런싱 추천',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
    text: '벤치마크 비교',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <main className="min-h-screen bg-[#0d0d14] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-700 shadow-xl shadow-purple-900/40 mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Portfolio Doctor</h1>
          <p className="text-gray-500 text-sm">내 투자 포트폴리오를 진단하고 최적화하세요</p>

          {/* 기능 뱃지 */}
          <div className="flex justify-center gap-2 mt-4">
            {features.map((f) => (
              <div key={f.text} className="flex items-center gap-1.5 text-[11px] bg-gray-800/60 text-gray-400 px-2.5 py-1.5 rounded-lg border border-gray-700/50">
                <span className="text-gray-500">{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-purple-600 focus:bg-gray-900 transition-colors"
              placeholder="example@email.com"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-purple-600 focus:bg-gray-900 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-800/50 bg-red-950/30 px-3 py-2.5 text-red-400 text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-colors mt-1 shadow-lg shadow-purple-900/30"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-5">
          계정이 없으신가요?{' '}
          <Link href="/register" className="text-purple-400 hover:text-purple-300 transition-colors">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}

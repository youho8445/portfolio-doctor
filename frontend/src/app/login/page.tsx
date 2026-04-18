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
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">
            Portfolio <span className="text-purple-400">Doctor</span>
          </h1>
          <p className="text-gray-400 text-sm">내 투자 포트폴리오를 진단하고 최적화하세요</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <span className="text-xs bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full border border-gray-700">📊 건강점수 진단</span>
            <span className="text-xs bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full border border-gray-700">🔄 리밸런싱 추천</span>
            <span className="text-xs bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full border border-gray-700">📈 벤치마크 비교</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
              placeholder="example@email.com"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
              placeholder="••••••"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          계정이 없으신가요?{' '}
          <Link href="/register" className="text-purple-400 hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}

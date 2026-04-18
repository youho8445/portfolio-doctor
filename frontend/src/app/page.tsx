import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <div className="inline-block bg-purple-900/30 border border-purple-700/50 rounded-full px-4 py-1 text-sm text-purple-300 mb-6">
          Portfolio Risk Analysis
        </div>
        <h1 className="text-6xl font-bold mb-4 text-white">
          Portfolio <span className="text-purple-400">Doctor</span>
        </h1>
        <p className="text-gray-400 text-xl mb-10 leading-relaxed">
          입력한 종목과 비중을 분석해서<br />
          건강 점수, 벤치마크 비교, 경고 메시지를 제공합니다.
        </p>
        <Link
          href="/analyzer"
          className="inline-block rounded-xl bg-purple-600 px-8 py-4 text-lg font-bold hover:bg-purple-500 transition-colors"
        >
          분석 시작하기 →
        </Link>
      </div>
    </main>
  );
}

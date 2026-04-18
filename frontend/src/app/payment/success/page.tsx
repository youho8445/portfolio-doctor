'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmTossPayment } from '@/lib/api';

function PaymentSuccessInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    const paymentKey = params.get('paymentKey');
    const orderId = params.get('orderId');
    const amount = Number(params.get('amount'));
    const portfolioId = Number(params.get('portfolioId'));

    if (!paymentKey || !orderId || !amount || !portfolioId) {
      setStatus('error');
      return;
    }

    confirmTossPayment(paymentKey, orderId, amount, portfolioId)
      .then((ok) => {
        if (ok) {
          setStatus('success');
          setTimeout(() => router.replace('/analyzer'), 2000);
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="text-center max-w-sm">
      {status === 'verifying' && (
        <>
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <div className="text-lg font-semibold text-gray-300">결제 확인 중...</div>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="text-5xl mb-4">🎉</div>
          <div className="text-xl font-bold text-white mb-2">결제 완료!</div>
          <div className="text-gray-400 text-sm mb-1">상세 리밸런싱 가이드가 열렸습니다.</div>
          <div className="text-gray-600 text-xs">잠시 후 분석 페이지로 이동합니다...</div>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="text-5xl mb-4">❌</div>
          <div className="text-lg font-bold text-white mb-2">결제 확인 실패</div>
          <div className="text-gray-400 text-sm mb-4">문제가 지속되면 고객센터에 문의해주세요.</div>
          <button
            onClick={() => router.replace('/analyzer')}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl transition-colors text-sm"
          >
            분석 페이지로 돌아가기
          </button>
        </>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-gray-400">로딩 중...</div>}>
        <PaymentSuccessInner />
      </Suspense>
    </main>
  );
}

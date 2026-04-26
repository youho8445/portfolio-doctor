'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

const CONSENT_CONTENTS = {
  terms: {
    title: '이용약관',
    body: `제1조 (목적)
본 약관은 Portfolio Doctor(이하 "서비스")의 이용조건 및 절차, 서비스 이용자와 운영자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (서비스 정의)
Portfolio Doctor는 사용자가 입력한 투자 포트폴리오 데이터를 기반으로 분석 정보를 제공하는 서비스입니다. 본 서비스는 투자 자문업 등록 없이 운영되는 정보 제공 서비스이며, 특정 종목의 매수·매도를 추천하거나 수익을 보장하지 않습니다.

제3조 (회원가입)
① 서비스 이용을 원하는 자는 본 약관에 동의하고 회원가입을 신청해야 합니다.
② 1인 1계정 원칙을 준수해야 하며, 타인의 정보를 도용하여 가입할 수 없습니다.

제4조 (서비스 이용)
① 서비스는 7일 무료 체험 후 유료 전환됩니다.
② 운영자는 서비스의 내용을 사전 고지 후 변경하거나 중단할 수 있습니다.

제5조 (금지행위)
① 타인의 정보 무단 수집 및 이용
② 서비스 운영 방해 행위
③ 허위 정보 등록

제6조 (책임 제한)
서비스 내 분석 결과는 참고 정보에 불과하며, 이를 기반으로 한 투자 결과에 대해 운영자는 책임지지 않습니다.

제7조 (준거법)
본 약관은 대한민국 법령에 따라 해석됩니다.

시행일: 2026년 4월 1일`,
  },
  privacy: {
    title: '개인정보 수집 및 이용',
    body: `Portfolio Doctor는 서비스 제공을 위해 다음과 같이 개인정보를 수집·이용합니다.

1. 수집 항목
  - 필수: 이름, 이메일 주소, 비밀번호(암호화 저장)
  - 선택: 마케팅 수신 동의 여부

2. 수집 목적
  - 회원 식별 및 로그인 처리
  - 서비스 이용 기록 관리
  - 고객 문의 처리

3. 보유 및 이용 기간
  - 회원 탈퇴 시까지 보유
  - 관계 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관

4. 제3자 제공
  - 원칙적으로 개인정보를 외부에 제공하지 않습니다.
  - 단, 법령에 의한 경우 예외적으로 제공할 수 있습니다.

5. 동의 거부 권리
  - 개인정보 수집·이용에 동의하지 않을 수 있으나, 거부 시 서비스 이용이 불가합니다.

시행일: 2026년 4월 1일`,
  },
  risk: {
    title: '투자 유의사항',
    body: `Portfolio Doctor 서비스를 이용하시기 전에 다음 사항을 반드시 확인하세요.

1. 본 서비스는 투자 참고 정보만을 제공합니다.
   Portfolio Doctor의 분석 결과는 투자 판단을 돕기 위한 참고 정보이며, 특정 종목의 매수·매도 추천이나 수익 보장을 의미하지 않습니다.

2. 투자 원금 손실 위험이 있습니다.
   모든 투자에는 원금 손실 위험이 존재하며, 과거 수익률이 미래 수익률을 보장하지 않습니다.

3. 최종 투자 판단은 본인의 책임입니다.
   서비스 내 제공되는 점수, 추천, 분석 정보를 맹목적으로 따르지 마시고, 전문 투자 자문가와 상담 후 본인의 판단에 따라 투자하시기 바랍니다.

4. 본 서비스는 금융투자업 인가를 받은 서비스가 아닙니다.
   Portfolio Doctor는 「자본시장과 금융투자업에 관한 법률」에 따른 투자자문업자가 아닙니다.

5. 시장 데이터의 정확성.
   본 서비스에서 사용되는 시세 데이터는 외부 API를 통해 제공되며, 실시간 데이터와 차이가 있을 수 있습니다.

위 사항을 충분히 이해하고 동의하는 경우에만 서비스를 이용해 주시기 바랍니다.

시행일: 2026년 4월 1일`,
  },
  marketing: {
    title: '마케팅 정보 수신 동의 (선택)',
    body: `Portfolio Doctor는 아래와 같이 마케팅 정보를 발송할 수 있습니다.

1. 수신 채널: 이메일

2. 발송 내용
  - 서비스 업데이트 및 새로운 기능 안내
  - 투자 관련 정보 및 뉴스레터
  - 프로모션 및 이벤트 안내

3. 수신 거부
  - 언제든지 마이페이지 또는 수신 이메일의 하단 링크를 통해 수신 거부할 수 있습니다.
  - 수신 거부 후에도 서비스 관련 필수 알림(거래 확인, 보안 알림 등)은 계속 발송됩니다.

4. 동의 거부 시 불이익
  - 마케팅 정보 수신 동의는 선택 사항이며, 동의하지 않아도 서비스 이용에 제한이 없습니다.

시행일: 2026년 4월 1일`,
  },
};

function ConsentModal({ type, onClose }: { type: keyof typeof CONSENT_CONTENTS; onClose: () => void }) {
  const content = CONSENT_CONTENTS[type];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl flex flex-col"
        style={{ background: '#2e2e36', maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#45454f' }}>
          <h2 className="text-white font-bold text-base">{content.title}</h2>
          <button onClick={onClose} style={{ color: '#6b7280' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5" style={{ color: '#c0bfd0', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-line' }}>
          {content.body}
        </div>
        <div className="px-6 py-4 border-t" style={{ borderColor: '#45454f' }}>
          <button
            onClick={onClose}
            className="w-full rounded-xl py-3 text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsentRow({
  checked,
  onChange,
  label,
  required,
  onView,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  required?: boolean;
  onView: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors"
        style={{
          background: checked ? '#7c3aed' : 'transparent',
          border: checked ? '2px solid #7c3aed' : '2px solid #55555f',
        }}
      >
        {checked && (
          <svg viewBox="0 0 12 10" fill="none" style={{ width: 10, height: 8 }}>
            <path d="M1 5l3 3.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className="flex-1 text-sm" style={{ color: '#c0bfd0' }}>
        {required && <span style={{ color: '#a78bfa', marginRight: 4 }}>[필수]</span>}
        {!required && <span style={{ color: '#6b7280', marginRight: 4 }}>[선택]</span>}
        {label}
      </span>
      <button
        type="button"
        onClick={onView}
        className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0"
        style={{ color: '#a78bfa', border: '1px solid #55405a', background: 'rgba(167,139,250,0.08)' }}
      >
        보기
      </button>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [agreeToPrivacy, setAgreeToPrivacy] = useState(false);
  const [agreeToRiskDisclaimer, setAgreeToRiskDisclaimer] = useState(false);
  const [agreeToMarketing, setAgreeToMarketing] = useState(false);
  const [modalType, setModalType] = useState<keyof typeof CONSENT_CONTENTS | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const allRequired = agreeToTerms && agreeToPrivacy && agreeToRiskDisclaimer;
  const allChecked = allRequired && agreeToMarketing;

  function toggleAll() {
    const next = !allChecked;
    setAgreeToTerms(next);
    setAgreeToPrivacy(next);
    setAgreeToRiskDisclaimer(next);
    setAgreeToMarketing(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allRequired) { setError('필수 동의 항목을 모두 확인해주세요'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, agreeToTerms, agreeToPrivacy, agreeToRiskDisclaimer, agreeToMarketing }),
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

  const inputStyle = { background: '#38383f', border: '1.5px solid transparent' };

  return (
    <>
      {modalType && <ConsentModal type={modalType} onClose={() => setModalType(null)} />}

      <main
        className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #f3f0ff 40%, #e8e4f8 100%)' }}
      >
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
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-base">Portfolio Doctor</span>
          </div>

          {/* 서비스 안내 배너 */}
          <div className="rounded-xl px-4 py-3 mb-6" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
            <p className="text-xs leading-relaxed" style={{ color: '#c4b5fd' }}>
              Portfolio Doctor는 <strong>수익을 보장하는 서비스가 아닙니다.</strong><br />
              본 서비스의 분석 결과는 투자 참고 정보이며, 모든 투자 판단과 책임은 사용자 본인에게 있습니다.
            </p>
          </div>

          {/* 타이틀 */}
          <div className="mb-5">
            <h1 className="text-white font-bold mb-1" style={{ fontSize: 26, letterSpacing: '-0.5px' }}>계정 만들기</h1>
            <p className="text-sm" style={{ color: '#b0afc0' }}>무료 7일 체험으로 시작해보세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이름 */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-widest" style={{ color: '#9ca3af' }}>이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
                onBlur={(e) => (e.target.style.borderColor = 'transparent')}
              />
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-widest" style={{ color: '#9ca3af' }}>이메일 주소</label>
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
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-widest" style={{ color: '#9ca3af' }}>비밀번호 (6자 이상)</label>
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: '#6b7280' }}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 동의 섹션 */}
            <div className="rounded-xl p-4" style={{ background: '#38383f' }}>
              {/* 전체 동의 */}
              <div
                className="flex items-center gap-3 pb-3 mb-2 cursor-pointer"
                style={{ borderBottom: '1px solid #50505a' }}
                onClick={toggleAll}
              >
                <div
                  className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors"
                  style={{
                    background: allChecked ? '#7c3aed' : 'transparent',
                    border: allChecked ? '2px solid #7c3aed' : '2px solid #55555f',
                  }}
                >
                  {allChecked && (
                    <svg viewBox="0 0 12 10" fill="none" style={{ width: 10, height: 8 }}>
                      <path d="M1 5l3 3.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-semibold text-white">전체 동의</span>
              </div>

              <ConsentRow checked={agreeToTerms} onChange={setAgreeToTerms} label="이용약관 동의" required onView={() => setModalType('terms')} />
              <ConsentRow checked={agreeToPrivacy} onChange={setAgreeToPrivacy} label="개인정보 수집 및 이용 동의" required onView={() => setModalType('privacy')} />
              <ConsentRow checked={agreeToRiskDisclaimer} onChange={setAgreeToRiskDisclaimer} label="투자 유의사항 확인" required onView={() => setModalType('risk')} />
              <ConsentRow checked={agreeToMarketing} onChange={setAgreeToMarketing} label="마케팅 정보 수신 동의" onView={() => setModalType('marketing')} />
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
              disabled={loading || !allRequired}
              className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', marginTop: 8 }}
            >
              {loading ? '가입 중...' : (<>계정 만들기 <span style={{ fontSize: 16 }}>→</span></>)}
            </button>
          </form>

          <p className="text-center text-xs mt-5" style={{ color: '#6b7280' }}>
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="font-semibold" style={{ color: '#a78bfa' }}>
              로그인
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}

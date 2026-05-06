'use client';

import { useRef, useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';
import { PortraLogo } from '@/components/brand/PortraLogo';

// Separate component so useGoogleLogin is only called when GoogleOAuthProvider is present
function GoogleLoginButton({
  onGoogleToken,
  loading,
}: {
  onGoogleToken: (accessToken: string) => void;
  loading: boolean;
}) {
  const googleLogin = useGoogleLogin({
    onSuccess: (tokenRes) => onGoogleToken(tokenRes.access_token),
    onError: () => onGoogleToken('__error__'),
  });
  return (
    <button
      onClick={() => googleLogin()}
      disabled={loading}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f3f4f6', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 500, color: '#111827', width: '100%', opacity: loading ? 0.6 : 1, transition: 'background 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#ede9fe')}
      onMouseLeave={e => (e.currentTarget.style.background = '#f3f4f6')}
    >
      <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      Google로 계속
    </button>
  );
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const GOOGLE_CONFIGURED = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type Step = 'main' | 'phone-verify' | 'email-login' | 'email-signup' | 'consent';

interface ConsentFields {
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
  agreeToRiskDisclaimer: boolean;
  agreeToMarketing: boolean;
}

interface PendingProfile {
  pendingToken: string;
  phoneNumber?: string;
  source: 'google' | 'phone';
}

const CONSENT_CONTENTS = {
  terms: {
    title: '이용약관',
    body: `제1조 (목적)\n본 약관은 Portra AI(이하 "서비스")의 이용조건 및 절차, 서비스 이용자와 운영자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.\n\n제2조 (서비스 정의)\nPortra AI는 사용자가 입력한 투자 포트폴리오 데이터를 기반으로 분석 정보를 제공하는 서비스입니다. 본 서비스는 투자 자문업 등록 없이 운영되는 정보 제공 서비스이며, 특정 종목의 매수·매도를 추천하거나 수익을 보장하지 않습니다.\n\n제3조 (회원가입)\n① 서비스 이용을 원하는 자는 본 약관에 동의하고 회원가입을 신청해야 합니다.\n② 1인 1계정 원칙을 준수해야 하며, 타인의 정보를 도용하여 가입할 수 없습니다.\n\n제4조 (서비스 이용)\n① 서비스는 7일 무료 체험 후 유료 전환됩니다.\n② 운영자는 서비스의 내용을 사전 고지 후 변경하거나 중단할 수 있습니다.\n\n제5조 (책임 제한)\n서비스 내 분석 결과는 참고 정보에 불과하며, 이를 기반으로 한 투자 결과에 대해 운영자는 책임지지 않습니다.\n\n시행일: 2026년 4월 1일`,
  },
  privacy: {
    title: '개인정보 수집 및 이용',
    body: `Portra AI는 서비스 제공을 위해 다음과 같이 개인정보를 수집·이용합니다.\n\n1. 수집 항목\n  - 필수: 이름, 이메일 또는 전화번호, 비밀번호(암호화 저장)\n  - 선택: 마케팅 수신 동의 여부\n\n2. 수집 목적\n  - 회원 식별 및 로그인 처리\n  - 서비스 이용 기록 관리\n  - 고객 문의 처리\n\n3. 보유 및 이용 기간\n  - 회원 탈퇴 시까지 보유\n  - 관계 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관\n\n4. 제3자 제공\n  - 원칙적으로 개인정보를 외부에 제공하지 않습니다.\n\n5. 동의 거부 권리\n  - 개인정보 수집·이용에 동의하지 않을 수 있으나, 거부 시 서비스 이용이 불가합니다.\n\n시행일: 2026년 4월 1일`,
  },
  risk: {
    title: '투자 유의사항',
    body: `Portra AI 서비스를 이용하시기 전에 다음 사항을 반드시 확인하세요.\n\n1. 본 서비스는 투자 참고 정보만을 제공합니다.\n   분석 결과는 투자 판단을 돕기 위한 참고 정보이며, 특정 종목의 매수·매도 추천이나 수익 보장을 의미하지 않습니다.\n\n2. 투자 원금 손실 위험이 있습니다.\n   모든 투자에는 원금 손실 위험이 존재하며, 과거 수익률이 미래 수익률을 보장하지 않습니다.\n\n3. 최종 투자 판단은 본인의 책임입니다.\n   서비스 내 제공되는 점수, 추천, 분석 정보를 맹목적으로 따르지 마시고, 전문 투자 자문가와 상담 후 본인의 판단에 따라 투자하시기 바랍니다.\n\n4. 본 서비스는 금융투자업 인가를 받은 서비스가 아닙니다.\n\n시행일: 2026년 4월 1일`,
  },
  marketing: {
    title: '마케팅 정보 수신 동의 (선택)',
    body: `Portra AI는 아래와 같이 마케팅 정보를 발송할 수 있습니다.\n\n1. 수신 채널: 이메일\n\n2. 발송 내용\n  - 서비스 업데이트 및 새로운 기능 안내\n  - 투자 관련 정보 및 뉴스레터\n  - 프로모션 및 이벤트 안내\n\n3. 수신 거부\n  - 언제든지 마이페이지 또는 수신 이메일의 하단 링크를 통해 수신 거부할 수 있습니다.\n\n4. 동의 거부 시 불이익\n  - 마케팅 정보 수신 동의는 선택 사항이며, 동의하지 않아도 서비스 이용에 제한이 없습니다.\n\n시행일: 2026년 4월 1일`,
  },
};

type ConsentKey = keyof typeof CONSENT_CONTENTS;

// ── Sub-components ──────────────────────────────────────────────────────────

function ConsentModal({ type, onClose }: { type: ConsentKey; onClose: () => void }) {
  const content = CONSENT_CONTENTS[type];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-2xl flex flex-col" style={{ background: '#1e1e26', maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#35354080' }}>
          <h3 className="text-white font-bold text-sm">{content.title}</h3>
          <button onClick={onClose} style={{ color: '#6b7280' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5" style={{ color: '#b0afc0', fontSize: 12.5, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
          {content.body}
        </div>
        <div className="px-6 py-4 border-t" style={{ borderColor: '#35354080' }}>
          <button onClick={onClose} className="w-full rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsentRow({ checked, onChange, label, subLabel, required, onView }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; subLabel?: string; required?: boolean; onView: () => void;
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <button type="button" onClick={() => onChange(!checked)} className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors mt-0.5" style={{ background: checked ? '#7c3aed' : 'transparent', border: checked ? '2px solid #7c3aed' : '2px solid #45454f' }}>
        {checked && (
          <svg viewBox="0 0 12 10" fill="none" style={{ width: 10, height: 8 }}>
            <path d="M1 5l3 3.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className="flex-1 text-xs" style={{ color: '#c0bfd0' }}>
        <span>
          {required ? <span style={{ color: '#a78bfa', marginRight: 4 }}>[필수]</span> : <span style={{ color: '#6b7280', marginRight: 4 }}>[선택]</span>}
          {label}
        </span>
        {subLabel && (
          <span style={{ display: 'block', fontSize: 10.5, color: '#9ca3af', marginTop: 2 }}>{subLabel}</span>
        )}
      </span>
      <button type="button" onClick={onView} className="text-xs px-2 py-0.5 rounded-md flex-shrink-0 mt-0.5" style={{ color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.06)' }}>
        보기
      </button>
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────

export function AuthModal() {
  const { isModalOpen, closeModal, login } = useAuth();

  const [step, setStep] = useState<Step>('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Phone state
  const [countryCode, setCountryCode] = useState('+82');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneFormatted, setPhoneFormatted] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Email state
  const [emailName, setEmailName] = useState('');
  const [emailAddr, setEmailAddr] = useState('');
  const [emailPw, setEmailPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Consent state
  const [consentModal, setConsentModal] = useState<ConsentKey | null>(null);
  const [consentName, setConsentName] = useState('');
  const [consent, setConsent] = useState<ConsentFields>({ agreeToTerms: false, agreeToPrivacy: false, agreeToRiskDisclaimer: false, agreeToMarketing: false });
  const [pendingProfile, setPendingProfile] = useState<PendingProfile | null>(null);

  // Email signup consents (separate state)
  const [signupConsent, setSignupConsent] = useState<ConsentFields>({ agreeToTerms: false, agreeToPrivacy: false, agreeToRiskDisclaimer: false, agreeToMarketing: false });

  const allConsentRequired = consent.agreeToTerms && consent.agreeToPrivacy && consent.agreeToRiskDisclaimer;
  const allSignupRequired = signupConsent.agreeToTerms && signupConsent.agreeToPrivacy && signupConsent.agreeToRiskDisclaimer;

  useEffect(() => {
    if (!isModalOpen) {
      setStep('main'); setError(''); setLoading(false);
      setPhoneInput(''); setOtpDigits(['', '', '', '', '', '']);
      setEmailAddr(''); setEmailPw(''); setEmailName('');
      setConsent({ agreeToTerms: false, agreeToPrivacy: false, agreeToRiskDisclaimer: false, agreeToMarketing: false });
      setSignupConsent({ agreeToTerms: false, agreeToPrivacy: false, agreeToRiskDisclaimer: false, agreeToMarketing: false });
      setPendingProfile(null); setConsentName('');
    }
  }, [isModalOpen]);

  // OTP timer countdown
  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setTimeout(() => setOtpTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [otpTimer]);

  // ── API helpers ────────────────────────────────────────────────────────
  async function post(path: string, body: unknown) {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : (data.message ?? '오류가 발생했습니다'));
    return data;
  }

  function handleSuccess(data: { access_token: string; user: Parameters<typeof login>[1] }) {
    login(data.access_token, data.user);
  }

  // ── Google ─────────────────────────────────────────────────────────────
  async function handleGoogleToken(accessToken: string) {
    if (accessToken === '__error__') { setError('Google 로그인에 실패했습니다'); return; }
    try {
      setLoading(true); setError('');
      const data = await post('/auth/google', { googleAccessToken: accessToken });
      if (data.needsConsent) {
        setPendingProfile({ pendingToken: data.pendingToken, source: 'google' });
        setConsentName(data.profile?.name ?? '');
        setStep('consent');
      } else {
        handleSuccess(data);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  // ── Phone ──────────────────────────────────────────────────────────────
  function formatPhone(cc: string, num: string): string {
    const digits = num.replace(/\D/g, '');
    if (cc === '+82' && digits.startsWith('0')) return cc + digits.slice(1);
    return cc + digits;
  }

  async function handleSendCode() {
    const formatted = formatPhone(countryCode, phoneInput);
    if (!phoneInput.trim()) { setError('전화번호를 입력해주세요'); return; }
    setLoading(true); setError('');
    try {
      await post('/auth/phone/send-code', { phoneNumber: formatted });
      setPhoneFormatted(formatted);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpTimer(60);
      setStep('phone-verify');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(i: number, val: string) {
    const ch = val.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[i] = ch;
    setOtpDigits(next);
    if (ch && i < 5) otpRefs.current[i + 1]?.focus();
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) otpRefs.current[i - 1]?.focus();
  }

  async function handleVerifyCode() {
    const code = otpDigits.join('');
    if (code.length !== 6) { setError('6자리 인증번호를 입력해주세요'); return; }
    setLoading(true); setError('');
    try {
      const data = await post('/auth/phone/verify-code', { phoneNumber: phoneFormatted, code });
      if (data.needsConsent) {
        setPendingProfile({ pendingToken: data.pendingToken, phoneNumber: phoneFormatted, source: 'phone' });
        setStep('consent');
      } else {
        handleSuccess(data);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  // ── Email ──────────────────────────────────────────────────────────────
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await post('/auth/email/login', { email: emailAddr.trim().toLowerCase(), password: emailPw });
      handleSuccess(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!allSignupRequired) { setError('필수 동의 항목을 모두 확인해주세요'); return; }
    setLoading(true); setError('');
    try {
      const data = await post('/auth/email/signup', {
        name: emailName.trim(), email: emailAddr.trim().toLowerCase(), password: emailPw,
        agreeToTerms: signupConsent.agreeToTerms,
        agreeToPrivacy: signupConsent.agreeToPrivacy,
        agreeToRiskDisclaimer: signupConsent.agreeToRiskDisclaimer,
        agreeToMarketing: signupConsent.agreeToMarketing,
      });
      handleSuccess(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  // ── Consent ────────────────────────────────────────────────────────────
  async function handleConsentSubmit() {
    if (!allConsentRequired || !pendingProfile) return;
    setLoading(true); setError('');
    try {
      const data = await post('/auth/complete-signup', {
        pendingToken: pendingProfile.pendingToken,
        name: consentName || undefined,
        consents: {
          agreeToTerms: consent.agreeToTerms,
          agreeToPrivacy: consent.agreeToPrivacy,
          agreeToRiskDisclaimer: consent.agreeToRiskDisclaimer,
          agreeToMarketing: consent.agreeToMarketing,
        },
      });
      handleSuccess(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  if (!isModalOpen) return null;

  // ── Shared styles ──────────────────────────────────────────────────────
  const overlay = { background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' };
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 480;
  const card = { background: '#ffffff', borderRadius: 20, width: '100%', maxWidth: 400, padding: isMobile ? '24px 18px' : '32px 28px', boxShadow: '0 24px 80px rgba(0,0,0,0.22)' };
  const btn = (accent = false): React.CSSProperties => ({
    width: '100%', borderRadius: 12, padding: '13px 0', fontSize: 14, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'opacity 0.15s',
    background: accent ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' : '#f3f4f6',
    color: accent ? '#fff' : '#1c1c1e',
    border: accent ? 'none' : '1.5px solid #e5e7eb',
  });
  const inputStyle: React.CSSProperties = { width: '100%', borderRadius: 10, padding: '12px 14px', fontSize: 14, background: '#f8fafc', border: '1.5px solid transparent', outline: 'none', color: '#1c1c1e', transition: 'border-color 0.15s' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, letterSpacing: '0.05em' };

  const Logo = () => (
    <div style={{ marginBottom: 24 }}>
      <PortraLogo size={30} />
    </div>
  );

  const BackBtn = ({ to }: { to: Step }) => (
    <button onClick={() => { setStep(to); setError(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20 }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
        <path d="M19 12H5m7-7l-7 7 7 7" />
      </svg>
      뒤로
    </button>
  );

  const CloseBtn = () => (
    <button onClick={closeModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );

  const ErrorBox = () => error ? (
    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: '#dc2626', marginTop: 8 }}>
      {error}
    </div>
  ) : null;

  const Divider = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
      <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
      <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>또는</span>
      <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
    </div>
  );

  // ── Render steps ───────────────────────────────────────────────────────
  const GoogleSvg = () => (
    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );

  const AppleSvg = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.42.07 2.41.75 3.24.8.78-.08 2.26-.95 3.8-.81 1.29.1 2.43.61 3.29 1.58-3.05 1.74-2.27 5.64.67 6.73-.48 1.13-1.15 2.24-3 4.58zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );

  // ───── STEP: main ─────
  const renderMain = () => (
    <>
      <Logo />
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 6 }}>로그인 또는 회원가입</h1>
      <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
        포트폴리오 저장, 분석 기록,<br />알림 기능을 이용할 수 있습니다.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {GOOGLE_CONFIGURED ? (
          <GoogleLoginButton onGoogleToken={handleGoogleToken} loading={loading} />
        ) : (
          <button
            disabled
            style={{ ...btn(), opacity: 0.4, cursor: 'not-allowed' }}
            title="Google 로그인이 아직 설정되지 않았습니다"
          >
            <GoogleSvg /> Google로 계속
          </button>
        )}

        <button
          onClick={() => { setStep('email-login'); setError(''); }}
          style={{ ...btn() }}
          onMouseEnter={e => (e.currentTarget.style.background = '#ede9fe')}
          onMouseLeave={e => (e.currentTarget.style.background = '#f3f4f6')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          이메일로 계속
        </button>
      </div>

      <ErrorBox />
    </>
  );

  // ───── STEP: phone-verify ─────
  const renderPhoneVerify = () => (
    <>
      <BackBtn to="main" />
      <Logo />
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 6 }}>인증번호 입력</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
        <span style={{ fontWeight: 600 }}>{phoneFormatted}</span>으로<br />6자리 인증번호를 발송했습니다.
        {process.env.NODE_ENV !== 'production' && (
          <span style={{ display: 'block', marginTop: 4, color: '#a78bfa', fontSize: 12 }}>개발 모드: 123456 사용</span>
        )}
      </p>

      {/* 6-digit boxes */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
        {otpDigits.map((d, i) => (
          <input
            key={i}
            ref={el => { otpRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleOtpChange(i, e.target.value)}
            onKeyDown={e => handleOtpKeyDown(i, e)}
            style={{
              width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700,
              borderRadius: 10, border: `1.5px solid ${d ? '#7c3aed' : '#e5e7eb'}`,
              background: d ? '#f5f3ff' : '#f8fafc', outline: 'none', color: '#1c1c1e',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onFocus={e => (e.target.style.borderColor = '#7c3aed')}
            onBlur={e => (e.target.style.borderColor = otpDigits[i] ? '#7c3aed' : '#e5e7eb')}
          />
        ))}
      </div>

      <button onClick={handleVerifyCode} disabled={loading || otpDigits.join('').length !== 6} style={{ ...btn(true), opacity: (loading || otpDigits.join('').length !== 6) ? 0.5 : 1 }}>
        {loading ? '확인 중...' : '계속하기'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        {otpTimer > 0 ? (
          <span style={{ fontSize: 12, color: '#9ca3af' }}>재전송 대기 {otpTimer}초</span>
        ) : (
          <button onClick={handleSendCode} disabled={loading} style={{ fontSize: 12, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            인증번호 재전송
          </button>
        )}
      </div>

      <ErrorBox />
    </>
  );

  // ───── STEP: email-login ─────
  const renderEmailLogin = () => (
    <>
      <BackBtn to="main" />
      <Logo />
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 24 }}>이메일로 로그인</h1>

      <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>이메일 주소</label>
          <input type="email" value={emailAddr} onChange={e => setEmailAddr(e.target.value)} required autoComplete="email" style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#7c3aed')} onBlur={e => (e.target.style.borderColor = 'transparent')} />
        </div>
        <div>
          <label style={labelStyle}>비밀번호</label>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} value={emailPw} onChange={e => setEmailPw(e.target.value)} required autoComplete="current-password" style={{ ...inputStyle, paddingRight: 40 }}
              onFocus={e => (e.target.style.borderColor = '#7c3aed')} onBlur={e => (e.target.style.borderColor = 'transparent')} />
            <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                {showPw ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
              </svg>
            </button>
          </div>
        </div>
        <ErrorBox />
        <button type="submit" disabled={loading} style={{ ...btn(true), opacity: loading ? 0.6 : 1, marginTop: 4 }}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280' }}>
        계정이 없으신가요?{' '}
        <button onClick={() => { setStep('email-signup'); setError(''); }} style={{ color: '#7c3aed', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
          회원가입
        </button>
      </div>
    </>
  );

  // ───── STEP: email-signup ─────
  const allSignupChecked = allSignupRequired && signupConsent.agreeToMarketing;
  const renderEmailSignup = () => (
    <>
      <BackBtn to="email-login" />
      <Logo />
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 20 }}>계정 만들기</h1>
      <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#7c3aed', lineHeight: 1.6 }}>
        Portra AI는 수익을 보장하는 서비스가 아닙니다.<br />분석 결과는 투자 참고 정보입니다.
      </div>

      <form onSubmit={handleEmailSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>이름</label>
          <input type="text" value={emailName} onChange={e => setEmailName(e.target.value)} required style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#7c3aed')} onBlur={e => (e.target.style.borderColor = 'transparent')} />
        </div>
        <div>
          <label style={labelStyle}>이메일 주소</label>
          <input type="email" value={emailAddr} onChange={e => setEmailAddr(e.target.value)} required autoComplete="email" style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#7c3aed')} onBlur={e => (e.target.style.borderColor = 'transparent')} />
        </div>
        <div>
          <label style={labelStyle}>비밀번호 (6자 이상)</label>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} value={emailPw} onChange={e => setEmailPw(e.target.value)} required minLength={6} autoComplete="new-password" style={{ ...inputStyle, paddingRight: 40 }}
              onFocus={e => (e.target.style.borderColor = '#7c3aed')} onBlur={e => (e.target.style.borderColor = 'transparent')} />
            <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                {showPw ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
              </svg>
            </button>
          </div>
        </div>

        {/* Consent */}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, marginBottom: 4, borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
            onClick={() => { const next = !allSignupChecked; setSignupConsent({ agreeToTerms: next, agreeToPrivacy: next, agreeToRiskDisclaimer: next, agreeToMarketing: next }); }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: allSignupChecked ? '#7c3aed' : 'transparent', border: allSignupChecked ? '2px solid #7c3aed' : '2px solid #d1d5db', flexShrink: 0 }}>
              {allSignupChecked && <svg viewBox="0 0 12 10" fill="none" style={{ width: 9, height: 7 }}><path d="M1 5l3 3.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>전체 동의</span>
          </div>
          <ConsentRow checked={signupConsent.agreeToTerms} onChange={v => setSignupConsent(s => ({ ...s, agreeToTerms: v }))} label="이용약관 동의" required onView={() => setConsentModal('terms')} />
          <ConsentRow checked={signupConsent.agreeToPrivacy} onChange={v => setSignupConsent(s => ({ ...s, agreeToPrivacy: v }))} label="개인정보 수집 및 이용 동의" required onView={() => setConsentModal('privacy')} />
          <ConsentRow checked={signupConsent.agreeToRiskDisclaimer} onChange={v => setSignupConsent(s => ({ ...s, agreeToRiskDisclaimer: v }))} label="Portra AI는 투자 참고 정보를 제공하며, 최종 투자 판단은 사용자에게 있습니다." subLabel="특정 종목의 매수·매도를 권장하거나 수익을 보장하지 않습니다." required onView={() => setConsentModal('risk')} />
          <ConsentRow checked={signupConsent.agreeToMarketing} onChange={v => setSignupConsent(s => ({ ...s, agreeToMarketing: v }))} label="마케팅 정보 수신 동의" onView={() => setConsentModal('marketing')} />
        </div>

        <ErrorBox />
        <button type="submit" disabled={loading || !allSignupRequired} style={{ ...btn(true), opacity: (loading || !allSignupRequired) ? 0.5 : 1 }}>
          {loading ? '가입 중...' : '계정 만들기'}
        </button>
      </form>
    </>
  );

  // ───── STEP: consent (for Google/Phone new users) ─────
  const allConsentChecked = allConsentRequired && consent.agreeToMarketing;
  const renderConsent = () => (
    <>
      <Logo />
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 6 }}>거의 다 됐어요!</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>
        서비스 이용을 위해 아래 약관에 동의해주세요.
      </p>

      {/* Name input for phone users */}
      {pendingProfile?.source === 'phone' && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>이름 (선택)</label>
          <input type="text" value={consentName} onChange={e => setConsentName(e.target.value)} placeholder="홍길동" style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#7c3aed')} onBlur={e => (e.target.style.borderColor = 'transparent')} />
        </div>
      )}

      <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e5e7eb', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, marginBottom: 4, borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
          onClick={() => { const next = !allConsentChecked; setConsent({ agreeToTerms: next, agreeToPrivacy: next, agreeToRiskDisclaimer: next, agreeToMarketing: next }); }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: allConsentChecked ? '#7c3aed' : 'transparent', border: allConsentChecked ? '2px solid #7c3aed' : '2px solid #d1d5db', flexShrink: 0 }}>
            {allConsentChecked && <svg viewBox="0 0 12 10" fill="none" style={{ width: 9, height: 7 }}><path d="M1 5l3 3.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>전체 동의</span>
        </div>
        <ConsentRow checked={consent.agreeToTerms} onChange={v => setConsent(s => ({ ...s, agreeToTerms: v }))} label="이용약관 동의" required onView={() => setConsentModal('terms')} />
        <ConsentRow checked={consent.agreeToPrivacy} onChange={v => setConsent(s => ({ ...s, agreeToPrivacy: v }))} label="개인정보 수집 및 이용 동의" required onView={() => setConsentModal('privacy')} />
        <ConsentRow checked={consent.agreeToRiskDisclaimer} onChange={v => setConsent(s => ({ ...s, agreeToRiskDisclaimer: v }))} label="투자 유의사항 확인" required onView={() => setConsentModal('risk')} />
        <ConsentRow checked={consent.agreeToMarketing} onChange={v => setConsent(s => ({ ...s, agreeToMarketing: v }))} label="마케팅 정보 수신 동의" onView={() => setConsentModal('marketing')} />
      </div>

      <ErrorBox />
      <button onClick={handleConsentSubmit} disabled={loading || !allConsentRequired} style={{ ...btn(true), opacity: (loading || !allConsentRequired) ? 0.5 : 1 }}>
        {loading ? '처리 중...' : '시작하기'}
      </button>
    </>
  );

  return (
    <>
      {consentModal && <ConsentModal type={consentModal} onClose={() => setConsentModal(null)} />}

      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={overlay}
        onClick={closeModal}
      >
        <div
          style={{ ...card, position: 'relative', overflowY: 'auto', maxHeight: '95vh' }}
          onClick={e => e.stopPropagation()}
        >
          <CloseBtn />
          {step === 'main' && renderMain()}
          {step === 'phone-verify' && renderPhoneVerify()}
          {step === 'email-login' && renderEmailLogin()}
          {step === 'email-signup' && renderEmailSignup()}
          {step === 'consent' && renderConsent()}
        </div>
      </div>
    </>
  );
}

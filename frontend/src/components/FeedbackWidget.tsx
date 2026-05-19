'use client';

import { useEffect, useRef, useState } from 'react';
import { checkFeedbackSubmitted, submitFeedback } from '@/lib/api';

type Rating = 'helpful' | 'unclear' | 'not_helpful';
type Step = 'rating' | 'followup' | 'thankyou';

const HELPFUL_REASONS = [
  '건강 점수가 직관적이었어요',
  '위험 신호를 쉽게 이해했어요',
  '리밸런싱 방향이 도움이 됐어요',
  '내 포트폴리오를 다시 보게 됐어요',
  '용어 설명이 좋았어요',
  '알림 기능이 유용해 보여요',
];

const NEGATIVE_REASONS = [
  '분석 이유가 이해하기 어려웠어요',
  '리밸런싱 제안이 너무 뻔했어요',
  'ETF 추천이 많았어요',
  '내 투자 성향이 반영되지 않은 것 같아요',
  '용어가 어려웠어요',
  '화면이 복잡했어요',
  '원하는 종목/시장이 없었어요',
  '알림 기능이 잘 이해되지 않았어요',
  '기타',
];

interface Props {
  analysisId: string;
  page: 'analysis_result' | 'rebalance_gate' | 'notification_setup';
  healthScore?: number | null;
  isGuest: boolean;
  /** compact=true renders a slimmer variant (e.g. rebalance gate) */
  compact?: boolean;
}

function dedupKey(analysisId: string) {
  return `feedback_submitted_${analysisId}`;
}

export default function FeedbackWidget({ analysisId, page, healthScore, isGuest, compact = false }: Props) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>('rating');
  const [rating, setRating] = useState<Rating | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Already submitted for this analysis in this session
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(dedupKey(analysisId))) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (!isGuest) {
      // Logged-in: check DB — once submitted, never show again
      void checkFeedbackSubmitted().then((submitted) => {
        if (!cancelled && !submitted) {
          timer = setTimeout(() => setVisible(true), 1500);
        }
      });
    } else {
      // Guest: 24h global cooldown
      if (typeof localStorage !== 'undefined') {
        const last = localStorage.getItem('feedback_last_submitted');
        if (last && Date.now() - Number(last) < 24 * 60 * 60 * 1000) return;
      }
      timer = setTimeout(() => setVisible(true), 1500);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [analysisId, isGuest]);

  useEffect(() => {
    if (step === 'thankyou') {
      dismissTimerRef.current = setTimeout(() => setVisible(false), 3000);
    }
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [step]);

  if (!visible) return null;

  const reasons = rating === 'helpful' ? HELPFUL_REASONS : NEGATIVE_REASONS;
  const isMulti = rating !== 'helpful';

  function handleRating(r: Rating) {
    setRating(r);
    if (compact) {
      // compact: skip follow-up, submit immediately
      void handleSubmit(r, [], '');
    } else {
      setStep('followup');
    }
  }

  function toggleReason(r: string) {
    if (rating === 'helpful') {
      setSelectedReasons([r]);
    } else {
      setSelectedReasons((prev) =>
        prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
      );
    }
  }

  async function handleSubmit(r?: Rating, forcedReasons?: string[], forcedMsg?: string) {
    if (submitting) return;
    setSubmitting(true);
    const finalRating = r ?? rating;
    if (!finalRating) return;

    await submitFeedback({
      analysisId,
      page,
      rating: finalRating,
      reasons: forcedReasons ?? (selectedReasons.length > 0 ? selectedReasons : null),
      message: (forcedMsg !== undefined ? forcedMsg : message).trim() || null,
      healthScore: healthScore ?? null,
      isGuest,
    });

    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(dedupKey(analysisId), '1');
    // Guest only: set 24h cooldown; logged-in users rely on server-side check
    if (isGuest && typeof localStorage !== 'undefined') {
      localStorage.setItem('feedback_last_submitted', String(Date.now()));
    }

    setStep('thankyou');
    setSubmitting(false);
  }

  function dismiss() {
    setVisible(false);
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: compact ? 12 : 20,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(92vw, 420px)',
    background: '#1c1c2e',
    border: '1px solid #2d2d44',
    borderRadius: 16,
    padding: compact ? '14px 16px' : '20px 20px 16px',
    zIndex: 1000,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    animation: 'feedbackSlideUp 0.3s ease',
  };

  const dismissBtn: React.CSSProperties = {
    position: 'absolute',
    top: 10,
    right: 12,
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: 18,
    lineHeight: 1,
    padding: '2px 4px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: compact ? 13 : 14,
    fontWeight: 600,
    color: '#e5e7eb',
    marginBottom: compact ? 10 : 14,
    paddingRight: 24,
  };

  const ratingRow: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  };

  function ratingBtnStyle(active: boolean): React.CSSProperties {
    return {
      flex: 1,
      minWidth: 90,
      padding: compact ? '7px 8px' : '9px 8px',
      borderRadius: 10,
      border: active ? '1.5px solid #7c3aed' : '1px solid #374151',
      background: active ? '#2d1b5e' : '#111827',
      color: '#e5e7eb',
      fontSize: compact ? 12 : 13,
      fontWeight: 500,
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 0.15s',
    };
  }

  function reasonBtnStyle(active: boolean): React.CSSProperties {
    return {
      padding: '7px 12px',
      borderRadius: 8,
      border: active ? '1.5px solid #7c3aed' : '1px solid #374151',
      background: active ? '#2d1b5e' : '#111827',
      color: active ? '#c4b5fd' : '#9ca3af',
      fontSize: 12,
      fontWeight: active ? 600 : 400,
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 0.15s',
      textAlign: 'left',
    };
  }

  if (step === 'thankyou') {
    return (
      <>
        <style>{`@keyframes feedbackSlideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
        <div style={containerStyle}>
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#a78bfa', marginBottom: 4 }}>피드백 감사합니다.</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>더 나은 분석을 만드는 데 반영할게요.</div>
          </div>
        </div>
      </>
    );
  }

  if (step === 'followup' && rating) {
    return (
      <>
        <style>{`@keyframes feedbackSlideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
        <div style={containerStyle}>
          <button style={dismissBtn} onClick={dismiss} aria-label="닫기">×</button>
          <div style={titleStyle}>
            {rating === 'helpful' ? '어떤 점이 가장 좋았나요?' : '어떤 부분이 아쉬웠나요?'}
            {isMulti && <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6, fontWeight: 400 }}>여러 개 선택 가능</span>}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
            {reasons.map((r) => (
              <button key={r} style={reasonBtnStyle(selectedReasons.includes(r))} onClick={() => toggleReason(r)}>
                {r}
              </button>
            ))}
          </div>

          {rating !== 'helpful' && (
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              placeholder="예: 리밸런싱 이유가 더 자세했으면 좋겠어요 / ETF 말고 개별주 기준도 보고 싶어요"
              style={{
                width: '100%',
                minHeight: 72,
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: 8,
                color: '#e5e7eb',
                fontSize: 12,
                padding: '9px 11px',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: 12,
                boxSizing: 'border-box',
              }}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={dismiss}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #374151', background: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              건너뛰기
            </button>
            <button
              onClick={() => handleSubmit()}
              disabled={submitting}
              style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 12, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.7 : 1 }}
            >
              제출하기
            </button>
          </div>
        </div>
      </>
    );
  }

  // Step: rating
  return (
    <>
      <style>{`@keyframes feedbackSlideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      <div style={containerStyle}>
        <button style={dismissBtn} onClick={dismiss} aria-label="닫기">×</button>
        <div style={titleStyle}>이 분석 결과가 도움이 되었나요?</div>
        <div style={ratingRow}>
          <button style={ratingBtnStyle(false)} onClick={() => handleRating('helpful')}>👍 도움 됐어요</button>
          <button style={ratingBtnStyle(false)} onClick={() => handleRating('unclear')}>🤔 애매해요</button>
          <button style={ratingBtnStyle(false)} onClick={() => handleRating('not_helpful')}>👎 도움 안 됐어요</button>
        </div>
      </div>
    </>
  );
}

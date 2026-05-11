'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import s from './landing.module.css';

export default function HomePage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const reveals = el.querySelectorAll(`.${s.reveal}`);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add(s.visible);
        });
      },
      { threshold: 0.15 },
    );
    reveals.forEach((r) => observer.observe(r));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={s.page} ref={pageRef}>

      {/* HERO */}
      <div className={s.hero}>
        <div className={s.logoArea}>
          <Image src="/portra-logo.png" width={108} height={72} alt="Portra AI" className={s.logoIconImg} />
          <span className={`${s.logoText} ${s.eng}`}>Portra AI</span>
        </div>

        <div className={s.badge}>
          <span className={s.badgeDot} />
          실시간 포트폴리오 진단 중
        </div>

        <h1 className={s.heroTitle}>
          AI가 매일<br />
          내 주식을<br />
          <span className={s.highlight}>건강검진</span> 해줍니다
        </h1>

        <p className={s.heroDesc}>
          포트폴리오 넣으면 됩니다.<br />
          분석, 리밸런싱, 알림까지 AI가 알아서.
        </p>

        <Link href="/analyzer" className={s.ctaBtn}>
          30일 무료로 시작하기 →
        </Link>
        <div className={s.ctaSub}>회원가입 후 30일 무료 · 언제든 해지</div>
        <div className={s.ctaDisclaimer}>분석 결과는 투자 참고 정보이며 수익을 보장하지 않습니다.</div>

        <div className={s.scores}>
          <div className={s.scoreCard}>
            <div className={`${s.label} ${s.eng}`}>Health Score</div>
            <div className={`${s.value} ${s.valueYellow}`}>50</div>
            <div className={s.sub}>예시 · 적용 전</div>
          </div>
          <div className={s.scoreCard}>
            <div className={`${s.label} ${s.eng}`}>After AI</div>
            <div className={`${s.value} ${s.valueGreen}`}>75</div>
            <div className={s.sub}>예시 · 적용 후</div>
          </div>
          <div className={s.scoreCard}>
            <div className={`${s.label} ${s.eng}`}>Return</div>
            <div className={`${s.value} ${s.valuePurple}`}>+46%</div>
            <div className={s.sub}>예시 수익</div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className={s.section}>
        <div className={s.reveal}>
          <div className={`${s.sectionLabel} ${s.eng}`}>Features</div>
          <h2 className={s.sectionTitle}>주식 앱은 많은데<br />진단까지 해주는 건<br />이게 처음이에요</h2>
          <p className={s.sectionDesc}>차트 보여주는 앱은 넘치지만, 내 포트폴리오가 건강한지 알려주는 앱은 없었습니다.</p>
        </div>

        <div className={`${s.featureCard} ${s.reveal}`}>
          <div className={`${s.featureIcon} ${s.mint}`}>🩺</div>
          <h3 className={s.featureTitle}>포트폴리오 건강 점수</h3>
          <p className={s.featureText}>분산도, 섹터 편중, 변동성을 종합 분석해서 0~100점으로 매일 진단합니다.</p>
          <span className={`${s.featureTag} ${s.mint} ${s.eng}`}>Health Score</span>
        </div>

        <div className={`${s.featureCard} ${s.reveal}`}>
          <div className={`${s.featureIcon} ${s.purple}`}>⚖️</div>
          <h3 className={s.featureTitle}>AI 리밸런싱 추천</h3>
          <p className={s.featureText}>"삼성전자 비중 50% → 25%로 축소" 같은 구체적 액션을 제안하고, 적용 후의 변화를 시뮬레이션합니다.</p>
          <span className={`${s.featureTag} ${s.purple} ${s.eng}`}>Rebalancing Strategy</span>
        </div>

        <div className={`${s.featureCard} ${s.reveal}`}>
          <div className={`${s.featureIcon} ${s.yellow}`}>🔔</div>
          <h3 className={s.featureTitle}>실시간 알림</h3>
          <p className={s.featureText}>포트폴리오에 변화가 생기면 브라우저 알림으로 즉시 알려줍니다. 장 켜놓고 뉴스 볼 필요 없습니다.</p>
        </div>

        <div className={`${s.featureCard} ${s.reveal}`}>
          <div className={`${s.featureIcon} ${s.red}`}>📰</div>
          <h3 className={s.featureTitle}>내 종목 맞춤 뉴스</h3>
          <p className={s.featureText}>보유 종목 관련 뉴스만 실시간으로 모아서 보여줍니다. 관계없는 정보는 빼고.</p>
        </div>
      </div>

      {/* BEFORE / AFTER */}
      <div className={s.section}>
        <div className={s.reveal}>
          <div className={`${s.sectionLabel} ${s.eng}`}>Before / After</div>
          <h2 className={s.sectionTitle}>AI 리밸런싱 한 번에<br />이만큼 바뀝니다</h2>
        </div>

        <div className={`${s.baContainer} ${s.reveal}`}>
          <div className={s.baSubText}>분산도 점수</div>
          <div className={s.baRow}>
            <div className={s.baBox}>
              <div className={`${s.baNum} ${s.before} ${s.eng}`}>40</div>
              <div className={s.baStatus}>리밸런싱 전</div>
            </div>
            <div className={s.baArrow}>→</div>
            <div className={s.baBox}>
              <div className={`${s.baNum} ${s.after} ${s.eng}`}>75</div>
              <div className={s.baStatus}>리밸런싱 후</div>
            </div>
          </div>
          <div className={`${s.baBadge} ${s.eng}`}>+35점 개선</div>
        </div>

        <p className={`${s.sectionDesc} ${s.reveal}`} style={{ textAlign: 'center', fontSize: '14px' }}>
          IT 섹터에 71% 집중된 포트폴리오를<br />
          AI가 3개 액션으로 분산시킨 실제 결과입니다.
        </p>
      </div>

      {/* NOTIFICATIONS */}
      <div className={s.section}>
        <div className={s.reveal}>
          <div className={`${s.sectionLabel} ${s.eng}`}>Notifications</div>
          <h2 className={s.sectionTitle}>안 들어와도<br />AI가 먼저 알려줘요</h2>
          <p className={s.sectionDesc}>매일 확인 안 해도 됩니다. 변화가 생기면 알림이 먼저 옵니다.</p>
        </div>

        <div className={`${s.notifMock} ${s.reveal}`}>
          <div className={`${s.notifDot} ${s.mint}`} />
          <div>
            <div className={s.notifText}><strong>조금만 바꾸면 크게 좋아질 수 있어요</strong><br />리밸런싱하면 분산도를 35점 높일 수 있어요.</div>
            <div className={s.notifTime}>오늘 오전 9:02</div>
          </div>
        </div>

        <div className={`${s.notifMock} ${s.reveal}`}>
          <div className={`${s.notifDot} ${s.yellow}`} />
          <div>
            <div className={s.notifText}><strong>IT 섹터 비중이 71%입니다</strong><br />다른 섹터도 추가해 보세요.</div>
            <div className={s.notifTime}>어제 오후 3:15</div>
          </div>
        </div>

        <div className={`${s.notifMock} ${s.reveal}`}>
          <div className={`${s.notifDot} ${s.purple}`} />
          <div>
            <div className={s.notifText}><strong>삼성전자 관련 뉴스 3건</strong><br />시가총액 사상 최고치 경신</div>
            <div className={s.notifTime}>어제 오전 10:30</div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className={s.section}>
        <div className={s.reveal}>
          <div className={`${s.sectionLabel} ${s.eng}`}>How It Works</div>
          <h2 className={s.sectionTitle}>30초면 됩니다</h2>
        </div>

        <div className={`${s.step} ${s.reveal}`}>
          <div className={`${s.stepNum} ${s.eng}`}>1</div>
          <div>
            <h4 className={s.stepTitle}>종목 검색해서 추가</h4>
            <p className={s.stepDesc}>보유 종목과 비중을 입력하세요. 한국·미국 주식 모두 지원합니다.</p>
          </div>
        </div>

        <div className={`${s.step} ${s.reveal}`}>
          <div className={`${s.stepNum} ${s.eng}`}>2</div>
          <div>
            <h4 className={s.stepTitle}>AI가 즉시 분석</h4>
            <p className={s.stepDesc}>건강 점수, 섹터 분산, 리밸런싱 추천까지 한 번에 확인할 수 있습니다.</p>
          </div>
        </div>

        <div className={`${s.step} ${s.reveal}`}>
          <div className={`${s.stepNum} ${s.eng}`}>3</div>
          <div>
            <h4 className={s.stepTitle}>매일 알림 받기</h4>
            <p className={s.stepDesc}>변화가 생기면 AI가 먼저 알려줍니다. 그냥 켜두기만 하면 됩니다.</p>
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className={s.finalCta}>
        <div className={s.divider} style={{ marginBottom: '40px' }} />
        <h2 className={s.finalTitle}>내 포트폴리오,<br />한 번 진단받아 보세요</h2>
        <p className={s.finalDesc}>지금 가입하면 30일 무료 체험이 시작됩니다.<br />종목만 넣으면 AI가 바로 분석합니다.</p>
        <Link href="/analyzer" className={s.ctaBtnFinal}>
          무료 체험 시작하기 →
        </Link>
      </div>

      {/* DISCLAIMER */}
      <div className={s.disclaimer}>
        본 서비스는 투자 조언을 제공하지 않습니다. 모든 투자 판단은 본인의 책임입니다.<br />
        표시된 수익률은 특정 시점의 데이터이며 미래 수익을 보장하지 않습니다.
      </div>

      {/* FOOTER */}
      <footer className={s.footer}>
        <span className={s.eng}>Portra AI</span> · 내 포트폴리오의 AI 주치의<br />
        <a href="mailto:youho2636@gmail.com" style={{ marginTop: '8px', display: 'inline-block' }}>문의하기</a>
      </footer>

    </div>
  );
}

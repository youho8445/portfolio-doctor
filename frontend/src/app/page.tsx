'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import s from './landing.module.css';
import { trackEvent } from '@/lib/api';
import { useTranslation } from '@/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function HomePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const trackedRef = useRef(false);
  const t = useTranslation();

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('pv_landing')) {
        sessionStorage.setItem('pv_landing', '1');
        const source = new URLSearchParams(window.location.search).get('utm_source');
        void trackEvent('page_view_landing', null, source);
      }
    }
  }, []);

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
          <Image src="/portra-logo.png" width={108} height={72} alt="PoBalance" className={s.logoIconImg} />
          <span className={`${s.logoText} ${s.eng}`}>PoBalance</span>
        </div>

        <div className={s.badge}>
          <span className={s.badgeDot} />
          {t('landing.badge')}
        </div>

        <h1 className={s.heroTitle}>
          {t('landing.heroLine1')}<br />
          {t('landing.heroLine2')}<br />
          <span className={s.highlight}>{t('landing.heroHighlight')}</span>{t('landing.heroLineSuffix')}
        </h1>

        <p className={s.heroDesc}>
          {t('landing.heroDescLine1')}<br />
          {t('landing.heroDescLine2')}
        </p>

        <Link href="/analyzer" className={s.ctaBtn}>
          {t('landing.cta')}
        </Link>
        <div className={s.ctaSub}>{t('landing.ctaSub')}</div>
        <div className={s.ctaDisclaimer}>{t('landing.ctaDisclaimer')}</div>

        <div className={s.scores}>
          <div className={s.scoreCard}>
            <div className={`${s.label} ${s.eng}`}>Health Score</div>
            <div className={`${s.value} ${s.valueYellow}`}>50</div>
            <div className={s.sub}>{t('landing.scoreLabelBefore')}</div>
          </div>
          <div className={s.scoreCard}>
            <div className={`${s.label} ${s.eng}`}>After AI</div>
            <div className={`${s.value} ${s.valueGreen}`}>75</div>
            <div className={s.sub}>{t('landing.scoreLabelAfter')}</div>
          </div>
          <div className={s.scoreCard}>
            <div className={`${s.label} ${s.eng}`}>Return</div>
            <div className={`${s.value} ${s.valuePurple}`}>+46%</div>
            <div className={s.sub}>{t('landing.scoreReturn')}</div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className={s.section}>
        <div className={s.reveal}>
          <div className={`${s.sectionLabel} ${s.eng}`}>Features</div>
          <h2 className={s.sectionTitle}>
            {t('landing.featuresSectionTitle').split('\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 ? <br /> : null}</span>
            ))}
          </h2>
          <p className={s.sectionDesc}>{t('landing.featuresSectionDesc')}</p>
        </div>

        <div className={`${s.featureCard} ${s.reveal}`}>
          <div className={`${s.featureIcon} ${s.mint}`}>🩺</div>
          <h3 className={s.featureTitle}>{t('landing.feature1Title')}</h3>
          <p className={s.featureText}>{t('landing.feature1Desc')}</p>
          <span className={`${s.featureTag} ${s.mint} ${s.eng}`}>Health Score</span>
        </div>

        <div className={`${s.featureCard} ${s.reveal}`}>
          <div className={`${s.featureIcon} ${s.purple}`}>⚖️</div>
          <h3 className={s.featureTitle}>{t('landing.feature2Title')}</h3>
          <p className={s.featureText}>{t('landing.feature2Desc')}</p>
          <span className={`${s.featureTag} ${s.purple} ${s.eng}`}>Rebalancing Strategy</span>
        </div>

        <div className={`${s.featureCard} ${s.reveal}`}>
          <div className={`${s.featureIcon} ${s.yellow}`}>🔔</div>
          <h3 className={s.featureTitle}>{t('landing.feature3Title')}</h3>
          <p className={s.featureText}>{t('landing.feature3Desc')}</p>
        </div>

        <div className={`${s.featureCard} ${s.reveal}`}>
          <div className={`${s.featureIcon} ${s.red}`}>📰</div>
          <h3 className={s.featureTitle}>{t('landing.feature4Title')}</h3>
          <p className={s.featureText}>{t('landing.feature4Desc')}</p>
        </div>
      </div>

      {/* BEFORE / AFTER */}
      <div className={s.section}>
        <div className={s.reveal}>
          <div className={`${s.sectionLabel} ${s.eng}`}>Before / After</div>
          <h2 className={s.sectionTitle}>{t('landing.baTitle1')}<br />{t('landing.baTitle2')}</h2>
        </div>

        <div className={`${s.baContainer} ${s.reveal}`}>
          <div className={s.baSubText}>{t('landing.baDivScore')}</div>
          <div className={s.baRow}>
            <div className={s.baBox}>
              <div className={`${s.baNum} ${s.before} ${s.eng}`}>40</div>
              <div className={s.baStatus}>{t('landing.baBefore')}</div>
            </div>
            <div className={s.baArrow}>→</div>
            <div className={s.baBox}>
              <div className={`${s.baNum} ${s.after} ${s.eng}`}>75</div>
              <div className={s.baStatus}>{t('landing.baAfter')}</div>
            </div>
          </div>
          <div className={`${s.baBadge} ${s.eng}`}>{t('landing.baImprove')}</div>
        </div>

        <p className={`${s.sectionDesc} ${s.reveal}`} style={{ textAlign: 'center', fontSize: '14px' }}>
          {t('landing.baSectorDesc').split('\n').map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 ? <br /> : null}</span>
          ))}
        </p>
      </div>

      {/* NOTIFICATIONS */}
      <div className={s.section}>
        <div className={s.reveal}>
          <div className={`${s.sectionLabel} ${s.eng}`}>Notifications</div>
          <h2 className={s.sectionTitle}>{t('landing.notifsTitle1')}<br />{t('landing.notifsTitle2')}</h2>
          <p className={s.sectionDesc}>{t('landing.notifsSub')}</p>
        </div>

        <div className={`${s.notifMock} ${s.reveal}`}>
          <div className={`${s.notifDot} ${s.mint}`} />
          <div>
            <div className={s.notifText}><strong>{t('landing.notif1Bold')}</strong><br />{t('landing.notif1Body')}</div>
            <div className={s.notifTime}>{t('landing.notif1Time')}</div>
          </div>
        </div>

        <div className={`${s.notifMock} ${s.reveal}`}>
          <div className={`${s.notifDot} ${s.yellow}`} />
          <div>
            <div className={s.notifText}><strong>{t('landing.notif2Bold')}</strong><br />{t('landing.notif2Body')}</div>
            <div className={s.notifTime}>{t('landing.notif2Time')}</div>
          </div>
        </div>

        <div className={`${s.notifMock} ${s.reveal}`}>
          <div className={`${s.notifDot} ${s.purple}`} />
          <div>
            <div className={s.notifText}><strong>{t('landing.notif3Bold')}</strong><br />{t('landing.notif3Body')}</div>
            <div className={s.notifTime}>{t('landing.notif3Time')}</div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className={s.section}>
        <div className={s.reveal}>
          <div className={`${s.sectionLabel} ${s.eng}`}>How It Works</div>
          <h2 className={s.sectionTitle}>{t('landing.howTitle')}</h2>
        </div>

        <div className={`${s.step} ${s.reveal}`}>
          <div className={`${s.stepNum} ${s.eng}`}>1</div>
          <div>
            <h4 className={s.stepTitle}>{t('landing.step1Title')}</h4>
            <p className={s.stepDesc}>{t('landing.step1Desc')}</p>
          </div>
        </div>

        <div className={`${s.step} ${s.reveal}`}>
          <div className={`${s.stepNum} ${s.eng}`}>2</div>
          <div>
            <h4 className={s.stepTitle}>{t('landing.step2Title')}</h4>
            <p className={s.stepDesc}>{t('landing.step2Desc')}</p>
          </div>
        </div>

        <div className={`${s.step} ${s.reveal}`}>
          <div className={`${s.stepNum} ${s.eng}`}>3</div>
          <div>
            <h4 className={s.stepTitle}>{t('landing.step3Title')}</h4>
            <p className={s.stepDesc}>{t('landing.step3Desc')}</p>
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className={s.finalCta}>
        <div className={s.divider} style={{ marginBottom: '40px' }} />
        <h2 className={s.finalTitle}>{t('landing.finalTitle1')}<br />{t('landing.finalTitle2')}</h2>
        <p className={s.finalDesc}>{t('landing.finalDescLine1')}<br />{t('landing.finalDescLine2')}</p>
        <Link href="/analyzer" className={s.ctaBtnFinal}>
          {t('landing.finalCta')}
        </Link>
      </div>

      {/* DISCLAIMER */}
      <div className={s.disclaimer}>
        {t('landing.disclaimerLine1')}<br />
        {t('landing.disclaimerLine2')}
      </div>

      {/* FOOTER */}
      <footer className={s.footer}>
        <span className={s.eng}>PoBalance</span> · {t('landing.footerTagline')}<br />
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
          <a href="mailto:youho2636@gmail.com">{t('landing.contact')}</a>
          <LanguageSwitcher />
        </div>
      </footer>

    </div>
  );
}

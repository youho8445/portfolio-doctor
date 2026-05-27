import Image from 'next/image';
import Link from 'next/link';
import s from './landing.module.css';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import LandingEffects from './LandingEffects';
import ko from '@/i18n/locales/ko.json';

const l = ko.landing;

export default function HomePage() {
  return (
    <div className={s.page}>
      <LandingEffects />

      {/* HERO */}
      <div className={s.hero}>
        <div className={s.logoArea}>
          <Image src="/portra-logo.png" width={108} height={72} alt="PoBalance" className={s.logoIconImg} />
          <span className={`${s.logoText} ${s.eng}`}>PoBalance</span>
        </div>

        <div className={s.badge}>
          <span className={s.badgeDot} />
          {l.badge}
        </div>

        <h1 className={s.heroTitle}>
          {l.heroLine1}<br />
          {l.heroLine2}<br />
          <span className={s.highlight}>{l.heroHighlight}</span>{l.heroLineSuffix}
        </h1>

        <p className={s.heroDesc}>
          {l.heroDescLine1}<br />
          {l.heroDescLine2}
        </p>

        <Link href="/analyzer" className={s.ctaBtn}>
          {l.cta}
        </Link>
        <div className={s.ctaSub}>{l.ctaSub}</div>
        <div className={s.ctaDisclaimer}>{l.ctaDisclaimer}</div>

        <div className={s.scores}>
          <div className={s.scoreCard}>
            <div className={`${s.label} ${s.eng}`}>Health Score</div>
            <div className={`${s.value} ${s.valueYellow}`}>50</div>
            <div className={s.sub}>{l.scoreLabelBefore}</div>
          </div>
          <div className={s.scoreCard}>
            <div className={`${s.label} ${s.eng}`}>After AI</div>
            <div className={`${s.value} ${s.valueGreen}`}>75</div>
            <div className={s.sub}>{l.scoreLabelAfter}</div>
          </div>
          <div className={s.scoreCard}>
            <div className={`${s.label} ${s.eng}`}>Return</div>
            <div className={`${s.value} ${s.valuePurple}`}>+46%</div>
            <div className={s.sub}>{l.scoreReturn}</div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className={s.section}>
        <div className={s.reveal}>
          <div className={`${s.sectionLabel} ${s.eng}`}>Features</div>
          <h2 className={s.sectionTitle}>
            {l.featuresSectionTitle.split('\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 ? <br /> : null}</span>
            ))}
          </h2>
          <p className={s.sectionDesc}>{l.featuresSectionDesc}</p>
        </div>

        <div className={`${s.featureCard} ${s.reveal}`}>
          <div className={`${s.featureIcon} ${s.mint}`}>🩺</div>
          <h3 className={s.featureTitle}>{l.feature1Title}</h3>
          <p className={s.featureText}>{l.feature1Desc}</p>
          <span className={`${s.featureTag} ${s.mint} ${s.eng}`}>Health Score</span>
        </div>

        <div className={`${s.featureCard} ${s.reveal}`}>
          <div className={`${s.featureIcon} ${s.purple}`}>⚖️</div>
          <h3 className={s.featureTitle}>{l.feature2Title}</h3>
          <p className={s.featureText}>{l.feature2Desc}</p>
          <span className={`${s.featureTag} ${s.purple} ${s.eng}`}>Rebalancing Strategy</span>
        </div>

        <div className={`${s.featureCard} ${s.reveal}`}>
          <div className={`${s.featureIcon} ${s.yellow}`}>🔔</div>
          <h3 className={s.featureTitle}>{l.feature3Title}</h3>
          <p className={s.featureText}>{l.feature3Desc}</p>
        </div>

        <div className={`${s.featureCard} ${s.reveal}`}>
          <div className={`${s.featureIcon} ${s.red}`}>📰</div>
          <h3 className={s.featureTitle}>{l.feature4Title}</h3>
          <p className={s.featureText}>{l.feature4Desc}</p>
        </div>
      </div>

      {/* BEFORE / AFTER */}
      <div className={s.section}>
        <div className={s.reveal}>
          <div className={`${s.sectionLabel} ${s.eng}`}>Before / After</div>
          <h2 className={s.sectionTitle}>{l.baTitle1}<br />{l.baTitle2}</h2>
        </div>

        <div className={`${s.baContainer} ${s.reveal}`}>
          <div className={s.baSubText}>{l.baDivScore}</div>
          <div className={s.baRow}>
            <div className={s.baBox}>
              <div className={`${s.baNum} ${s.before} ${s.eng}`}>40</div>
              <div className={s.baStatus}>{l.baBefore}</div>
            </div>
            <div className={s.baArrow}>→</div>
            <div className={s.baBox}>
              <div className={`${s.baNum} ${s.after} ${s.eng}`}>75</div>
              <div className={s.baStatus}>{l.baAfter}</div>
            </div>
          </div>
          <div className={`${s.baBadge} ${s.eng}`}>{l.baImprove}</div>
        </div>

        <p className={`${s.sectionDesc} ${s.reveal}`} style={{ textAlign: 'center', fontSize: '14px' }}>
          {l.baSectorDesc.split('\n').map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 ? <br /> : null}</span>
          ))}
        </p>
      </div>

      {/* NOTIFICATIONS */}
      <div className={s.section}>
        <div className={s.reveal}>
          <div className={`${s.sectionLabel} ${s.eng}`}>Notifications</div>
          <h2 className={s.sectionTitle}>{l.notifsTitle1}<br />{l.notifsTitle2}</h2>
          <p className={s.sectionDesc}>{l.notifsSub}</p>
        </div>

        <div className={`${s.notifMock} ${s.reveal}`}>
          <div className={`${s.notifDot} ${s.mint}`} />
          <div>
            <div className={s.notifText}><strong>{l.notif1Bold}</strong><br />{l.notif1Body}</div>
            <div className={s.notifTime}>{l.notif1Time}</div>
          </div>
        </div>

        <div className={`${s.notifMock} ${s.reveal}`}>
          <div className={`${s.notifDot} ${s.yellow}`} />
          <div>
            <div className={s.notifText}><strong>{l.notif2Bold}</strong><br />{l.notif2Body}</div>
            <div className={s.notifTime}>{l.notif2Time}</div>
          </div>
        </div>

        <div className={`${s.notifMock} ${s.reveal}`}>
          <div className={`${s.notifDot} ${s.purple}`} />
          <div>
            <div className={s.notifText}><strong>{l.notif3Bold}</strong><br />{l.notif3Body}</div>
            <div className={s.notifTime}>{l.notif3Time}</div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className={s.section}>
        <div className={s.reveal}>
          <div className={`${s.sectionLabel} ${s.eng}`}>How It Works</div>
          <h2 className={s.sectionTitle}>{l.howTitle}</h2>
        </div>

        <div className={`${s.step} ${s.reveal}`}>
          <div className={`${s.stepNum} ${s.eng}`}>1</div>
          <div>
            <h4 className={s.stepTitle}>{l.step1Title}</h4>
            <p className={s.stepDesc}>{l.step1Desc}</p>
          </div>
        </div>

        <div className={`${s.step} ${s.reveal}`}>
          <div className={`${s.stepNum} ${s.eng}`}>2</div>
          <div>
            <h4 className={s.stepTitle}>{l.step2Title}</h4>
            <p className={s.stepDesc}>{l.step2Desc}</p>
          </div>
        </div>

        <div className={`${s.step} ${s.reveal}`}>
          <div className={`${s.stepNum} ${s.eng}`}>3</div>
          <div>
            <h4 className={s.stepTitle}>{l.step3Title}</h4>
            <p className={s.stepDesc}>{l.step3Desc}</p>
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className={s.finalCta}>
        <div className={s.divider} style={{ marginBottom: '40px' }} />
        <h2 className={s.finalTitle}>{l.finalTitle1}<br />{l.finalTitle2}</h2>
        <p className={s.finalDesc}>{l.finalDescLine1}<br />{l.finalDescLine2}</p>
        <Link href="/analyzer" className={s.ctaBtnFinal}>
          {l.finalCta}
        </Link>
      </div>

      {/* DISCLAIMER */}
      <div className={s.disclaimer}>
        {l.disclaimerLine1}<br />
        {l.disclaimerLine2}
      </div>

      {/* FOOTER */}
      <footer className={s.footer}>
        <span className={s.eng}>PoBalance</span> · {l.footerTagline}<br />
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
          <a href="mailto:youho2636@gmail.com">{l.contact}</a>
          <LanguageSwitcher />
        </div>
      </footer>

    </div>
  );
}

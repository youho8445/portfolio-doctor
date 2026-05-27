'use client';

import { useLocale, SUPPORTED_LOCALES, LOCALE_LABEL, type Locale } from '@/i18n';

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

export default function LanguageSwitcher({ className = '', style }: Props) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={`flex gap-1 items-center ${className}`} style={style}>
      {SUPPORTED_LOCALES.map((l: Locale) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className="text-[11px] px-2 py-1 rounded-lg font-semibold transition-all"
          style={{
            background: locale === l ? '#7c3aed' : 'transparent',
            color: locale === l ? 'white' : '#94a3b8',
            border: `1px solid ${locale === l ? '#7c3aed' : '#e8ecf4'}`,
          }}
        >
          {LOCALE_LABEL[l]}
        </button>
      ))}
    </div>
  );
}

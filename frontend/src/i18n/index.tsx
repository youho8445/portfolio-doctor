'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import koMessages from './locales/ko.json';
import enMessages from './locales/en.json';

export type Locale = 'ko' | 'en';
export const SUPPORTED_LOCALES: Locale[] = ['ko', 'en'];

const LOCALE_LABEL: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
};
export { LOCALE_LABEL };

type MsgTree = Record<string, unknown>;

const MESSAGES: Record<Locale, MsgTree> = {
  ko: koMessages as MsgTree,
  en: enMessages as MsgTree,
};

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'ko';
  const stored = localStorage.getItem('pobalance_lang') as Locale | null;
  if (stored && (SUPPORTED_LOCALES as string[]).includes(stored)) return stored;
  const browser = navigator.language.slice(0, 2);
  if ((SUPPORTED_LOCALES as string[]).includes(browser)) return browser as Locale;
  return 'ko';
}

function resolve(tree: MsgTree, key: string): string | null {
  const parts = key.split('.');
  let cur: unknown = tree;
  for (const p of parts) {
    if (typeof cur !== 'object' || cur === null) return null;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : null;
}

interface LangCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangCtx>({
  locale: 'ko',
  setLocale: () => {},
  t: (key) => resolve(MESSAGES.ko, key) ?? key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ko');

  useEffect(() => {
    const detected = detectLocale();
    setLocaleState(detected);
    document.documentElement.lang = detected;
  }, []);

  function setLocale(l: Locale) {
    localStorage.setItem('pobalance_lang', l);
    setLocaleState(l);
    document.documentElement.lang = l;
  }

  function t(key: string): string {
    return (
      resolve(MESSAGES[locale], key) ??
      resolve(MESSAGES.ko, key) ??
      key
    );
  }

  return (
    <LangContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useTranslation(): (key: string) => string {
  return useContext(LangContext).t;
}

export function useLocale(): { locale: Locale; setLocale: (l: Locale) => void } {
  const { locale, setLocale } = useContext(LangContext);
  return { locale, setLocale };
}

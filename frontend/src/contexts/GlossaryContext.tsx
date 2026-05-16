'use client';

import { createContext, useContext } from 'react';

interface GlossaryContextValue {
  openFor: (term: string) => void;
}

export const GlossaryContext = createContext<GlossaryContextValue | null>(null);

export function useGlossary() {
  const ctx = useContext(GlossaryContext);
  if (!ctx) throw new Error('useGlossary must be used within GlossaryContext.Provider');
  return ctx;
}

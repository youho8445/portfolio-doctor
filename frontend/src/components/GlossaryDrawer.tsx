'use client';

import { useState, useEffect, useRef } from 'react';
import { GLOSSARY, GLOSSARY_CATEGORIES, type GlossaryCategory } from '@/data/glossary';
import { useTranslation } from '@/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const ORDERED_CATEGORIES = [
  '기본 개념',
  '투자 행동',
  '리스크 관리',
  '시장/지수',
  '재무지표',
  '투자자/수급',
  '심리/밈 용어',
] as const;

const CAT_COLOR: Record<string, { bg: string; text: string }> = {
  '기본 개념':    { bg: '#fef3c7', text: '#d97706' },
  '투자 행동':   { bg: '#fee2e2', text: '#dc2626' },
  '리스크 관리': { bg: '#ede9fe', text: '#7c3aed' },
  '시장/지수':   { bg: '#dbeafe', text: '#2563eb' },
  '재무지표':    { bg: '#d1fae5', text: '#059669' },
  '투자자/수급': { bg: '#e0f2fe', text: '#0284c7' },
  '심리/밈 용어': { bg: '#fce7f3', text: '#db2777' },
};

export default function GlossaryDrawer({ open, onClose, initialQuery }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GlossaryCategory>('전체');
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslation();

  useEffect(() => {
    if (open) {
      setQuery(initialQuery ?? '');
      setCategory('전체');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const q = query.trim().toLowerCase();

  const filtered = GLOSSARY.filter((t) => {
    const matchCat = category === '전체' || t.category === category;
    const matchQ =
      !q ||
      t.term.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      (t.aliases?.some((a) => a.toLowerCase().includes(q)) ?? false);
    return matchCat && matchQ;
  });

  const grouped = q
    ? null
    : ORDERED_CATEGORIES.map((cat) => ({
        label: cat,
        terms: filtered.filter((t) => t.category === cat),
      })).filter((g) => g.terms.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
        style={{ background: '#ffffff', maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 shrink-0" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📘</span>
              <span className="font-bold text-sm" style={{ color: '#1c1c1e' }}>{t('glossary.title')}</span>
              <span className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ background: '#f1f5f9', color: '#94a3b8' }}>
                {filtered.length}개
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ background: '#f1f5f9', color: '#64748b' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('glossary.searchPlaceholder')}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none mb-3"
            style={{ background: '#f8fafc', border: '1.5px solid #e8ecf4', color: '#1c1c1e' }}
            onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
            onBlur={(e) => (e.target.style.borderColor = '#e8ecf4')}
          />

          {/* Category tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {GLOSSARY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={
                  category === cat
                    ? { background: '#7c3aed', color: '#ffffff' }
                    : { background: '#f1f5f9', color: '#64748b' }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#94a3b8' }}>
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm font-medium">{t('glossary.noResults')}</div>
              <div className="text-xs mt-1">{t('glossary.noResultsHint')}</div>
            </div>
          ) : q ? (
            <div className="space-y-2">
              {filtered.map((t) => (
                <TermCard key={t.term} term={t} />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {(grouped ?? []).map((group) => (
                <div key={group.label}>
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest mb-2"
                    style={{ color: '#94a3b8' }}
                  >
                    {group.label}
                  </div>
                  <div className="space-y-2">
                    {group.terms.map((t) => (
                      <TermCard key={t.term} term={t} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 shrink-0" style={{ borderTop: '1px solid #f1f5f9' }}>
          <p className="text-[10px] text-center" style={{ color: '#cbd5e1' }}>
            {t('glossary.footerDisclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}

function TermCard({ term: t }: { term: import('@/data/glossary').GlossaryTerm }) {
  const colors = CAT_COLOR[t.category] ?? { bg: '#f1f5f9', text: '#64748b' };

  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ background: '#f8fafc', border: '1px solid #e8ecf4' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold text-sm" style={{ color: '#1c1c1e' }}>{t.term}</span>
        <span
          className="text-[9px] font-bold rounded-full px-1.5 py-0.5 shrink-0"
          style={{ background: colors.bg, color: colors.text }}
        >
          {t.category}
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>{t.description}</p>
      {t.caution && (
        <p className="text-[11px] leading-relaxed mt-1.5" style={{ color: '#b45309' }}>
          ⚠️ {t.caution}
        </p>
      )}
    </div>
  );
}

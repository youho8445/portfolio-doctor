'use client';

import { useState, useEffect, useRef } from 'react';
import { GLOSSARY } from '@/data/glossary';

interface Props {
  term: string;
  children: React.ReactNode;
}

export default function TermTooltip({ term, children }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  const entry = GLOSSARY.find((g) => g.term === term);
  if (!entry) return <>{children}</>;

  // Close when clicking outside (handles mobile tap-outside)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-flex items-center gap-0.5">
      {children}
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${term} 설명 보기`}
        className="inline-flex items-center justify-center rounded-full shrink-0 transition-colors"
        style={{
          width: 14,
          height: 14,
          background: open ? '#7c3aed' : '#e8ecf4',
          color: open ? '#ffffff' : '#94a3b8',
          fontSize: 9,
          fontWeight: 700,
          lineHeight: 1,
          verticalAlign: 'middle',
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        ?
      </button>
      {open && (
        <span
          className="absolute z-50 rounded-xl shadow-xl"
          style={{
            bottom: '120%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 220,
            background: '#1c1c1e',
            color: '#f8fafc',
            padding: '10px 12px',
            pointerEvents: 'none',
          }}
        >
          <span className="block font-bold text-xs mb-0.5" style={{ color: '#a78bfa' }}>{entry.term}</span>
          <span className="block text-[11px] leading-relaxed">{entry.description}</span>
          {/* Caret */}
          <span
            style={{
              position: 'absolute',
              bottom: -5,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #1c1c1e',
            }}
          />
        </span>
      )}
    </span>
  );
}

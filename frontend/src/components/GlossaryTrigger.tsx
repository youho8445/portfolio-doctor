'use client';

import { useGlossary } from '@/contexts/GlossaryContext';

interface Props {
  term: string;
  label?: string;
}

export default function GlossaryTrigger({ term, label }: Props) {
  const { openFor } = useGlossary();

  if (label) {
    return (
      <button
        type="button"
        onClick={() => openFor(term)}
        aria-label={`${term} 용어 설명 보기`}
        className="inline-flex items-center gap-0.5 rounded-full transition-opacity hover:opacity-70"
        style={{
          background: '#ede9fe',
          color: '#7c3aed',
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 8px',
          lineHeight: 1.4,
        }}
      >
        {label}
        <span style={{ fontSize: 9, fontWeight: 700, marginLeft: 1 }}>?</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openFor(term)}
      aria-label={`${term} 용어 설명 보기`}
      className="inline-flex items-center justify-center shrink-0 transition-opacity hover:opacity-70"
      style={{
        width: 28,
        height: 28,
        background: 'transparent',
        verticalAlign: 'middle',
        margin: '-7px -7px',
      }}
    >
      <span
        className="rounded-full inline-flex items-center justify-center"
        style={{
          width: 14,
          height: 14,
          background: '#e8ecf4',
          color: '#94a3b8',
          fontSize: 9,
          fontWeight: 700,
          lineHeight: 1,
          pointerEvents: 'none',
        }}
      >
        ?
      </span>
    </button>
  );
}

'use client';

import { useId } from 'react';

export interface PortraLogoProps {
  size?: number;
  showText?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}
export interface PortraSymbolProps { size?: number; className?: string; }
export interface PortraAppIconProps { size?: number; className?: string; }

// ── SVG symbol ─────────────────────────────────────────────────────────────
//
// viewBox 0 0 92 92
//
// Two elements, identical stroke weight (6pt), single continuous gradient:
//
//   1. Perfect circle ring — cx=46 cy=46 r=28
//
//   2. Flowing line — enters bottom-left outside circle, creates a smooth
//      fluid "N"-wave through the interior, exits top-right as an arrow.
//
//      The path is mathematically C1-continuous (matching tangents at every
//      junction — no kinks anywhere):
//
//        (12,80) ─ approach ──► (26,66) ← circle entry at 225°, tangent 45°
//                 ─ up-stroke ─► (42,24) ← horizontal inflection (top of N)
//                 ─ diagonal ──► (60,66) ← horizontal inflection (valley of N)
//                 ─ up-stroke ─► (66,26) ← circle exit at 45°, tangent 45°
//                 ─ exit ──────► (80, 8) ← arrow tip
//
//      C1 proof — at each junction, incoming & outgoing tangent match:
//        (26,66): (20,72)→(26,66)→(32,60)  both ≡ (1,−1) direction ✓
//        (42,24): (30,24)→(42,24)→(54,24)  both horizontal ✓
//        (60,66): (56,66)→(60,66)→(64,66)  both horizontal ✓
//        (66,26): (60,32)→(66,26)→(72,20)  both ≡ (1,−1) direction ✓
//
// Gradient: #6C5CE7 (purple, bottom-left) → #2D9CDB (blue) → #2ECC71 (green, top-right)
//           Applied to both circle stroke and line stroke for cohesive look.

const VW = 92, VH = 92;

function Sym({ gid, size }: { gid: string; size: number }) {
  const g = `url(#${gid}g)`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${VW} ${VH}`} fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        {/* Diagonal gradient: bottom-left purple → top-right green */}
        <linearGradient id={`${gid}g`} x1="10" y1="84" x2="84" y2="8"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6C5CE7" />
          <stop offset="50%"  stopColor="#2D9CDB" />
          <stop offset="100%" stopColor="#2ECC71" />
        </linearGradient>
      </defs>

      {/* ── Perfect circle ring (same stroke as the flowing line) ── */}
      <circle cx="46" cy="46" r="28" stroke={g} strokeWidth="6" />

      {/* ── Flowing N-wave (C1-smooth, enters and exits the circle) ── */}
      <path
        d={[
          'M 12,80',
          'C 14,78 20,72 26,66',   // approach → enter circle at (26,66)
          'C 32,60 30,24 42,24',   // up-stroke → horizontal inflection at top (42,24)
          'C 54,24 56,66 60,66',   // diagonal  → horizontal inflection at valley (60,66)
          'C 64,66 60,32 66,26',   // up-stroke → exit circle at (66,26)
          'C 72,20 70,18 80,8',    // exit → arrow tip (80,8)
        ].join(' ')}
        stroke={g} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
      />

      {/* ── Arrow head at (80,8), pointing 45° upper-right ── */}
      {/* Triangle: tip(80,8) base1(76,18) base2(70,12)        */}
      <path d="M 80,8 L 76,18 L 70,12 Z" fill="#2ECC71" />
    </svg>
  );
}

// ── Public exports ────────────────────────────────────────────────────────

export function PortraSymbol({ size = 36, className }: PortraSymbolProps) {
  const raw = useId();
  return (
    <span className={className} style={{ display: 'inline-flex' }} aria-label="Portra AI">
      <Sym gid={`ptsy${raw.replace(/\W/g, '')}`} size={size} />
    </span>
  );
}

export function PortraLogo({
  size = 36,
  showText = true,
  variant = 'light',
  className,
}: PortraLogoProps) {
  const raw = useId();
  const color = variant === 'dark' ? '#ffffff' : '#0f172a';
  const fontSize = Math.round(size * 0.72);
  const gap = Math.round(size * 0.28);

  return (
    <div
      className={`flex items-center${className ? ` ${className}` : ''}`}
      style={{ gap }}
      role="img"
      aria-label="Portra AI"
    >
      <Sym gid={`ptlg${raw.replace(/\W/g, '')}`} size={size} />
      {showText && (
        <span style={{
          fontFamily: 'var(--font-dm-sans), Inter, -apple-system, sans-serif',
          fontSize,
          fontWeight: 700,
          color,
          letterSpacing: '-0.025em',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          Portra AI
        </span>
      )}
    </div>
  );
}

export function PortraAppIcon({ size = 64, className }: PortraAppIconProps) {
  const raw = useId();
  const symbolSize = Math.round(size * 0.62);

  return (
    <div
      className={className}
      role="img"
      aria-label="Portra AI"
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.22),
        background: '#0F1020',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Sym gid={`ptic${raw.replace(/\W/g, '')}`} size={symbolSize} />
    </div>
  );
}

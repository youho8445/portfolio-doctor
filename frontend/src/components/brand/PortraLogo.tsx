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

// ── Symbol design ────────────────────────────────────────────────────────────
//
// viewBox 0 0 48 48 — square, scales cleanly at every size
//
// Concept: portfolio circle + rising trend line with arrow
//   • Circle  — the portfolio universe (all holdings in one view)
//   • Line    — the AI analysis trajectory, passes through the circle
//   • Arrow   — direction of growth / optimized path
//
// Both elements share the same 4.5pt stroke and the same gradient,
// making them feel like a single cohesive mark.
//
// Path is C1-smooth (matching tangents at every junction = zero kinks):
//
//   (4,44) ── approach ──► (12,36) ← circle entry at 225°
//          ── slight dip ─► (18,24) ← inflection (analysis trough)
//          ── rising arc ──► (36,12) ← circle exit at 45°
//          ── exit ────────► (44, 4) ← arrow tip
//
//   Tangent match proof:
//     (12,36): CP (10,40)→(14,32)  both ≡ (2,−4) ✓
//     (18,24): CP (14,26)→(22,22)  both ≡ (4,−2) ✓
//     (36,12): CP (30,18)→(42, 6)  both ≡ (6,−6) ✓
//
// Gradient runs along the same diagonal as the path (4,44)→(44,4):
//   deep purple #6C5CE7 ── vibrant blue #2D9CDB ── mint green #2ECC71
//   Bottom-left of circle = purple.  Top-right / arrow = green.

const VW = 48, VH = 48;

function Sym({ gid, size }: { gid: string; size: number }) {
  const g = `url(#${gid}g)`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${VW} ${VH}`} fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        {/* Gradient runs along the exact same diagonal as the trend line */}
        <linearGradient id={`${gid}g`} x1="4" y1="44" x2="44" y2="4"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6C5CE7" />
          <stop offset="50%"  stopColor="#2D9CDB" />
          <stop offset="100%" stopColor="#2ECC71" />
        </linearGradient>
      </defs>

      {/* ── Portfolio circle ── */}
      <circle cx="24" cy="24" r="17"
        stroke={g} strokeWidth="4.5" />

      {/* ── Rising trend line (C1-smooth, enters and exits the circle) ── */}
      {/*   Start outside bottom-left → slight dip inside (analysis)     */}
      {/*   → strong rise → exit upper-right → arrow                     */}
      <path
        d={[
          'M 4,44',
          'C 6,42 10,40 12,36',   // approach → circle entry (12,36)
          'C 14,32 14,26 18,24',  // slight diagnostic dip → inflection
          'C 22,22 30,18 36,12',  // strong recovery rise → circle exit (36,12)
          'C 42,6 38,10 44,4',    // exit circle → arrow tip (44,4)
        ].join(' ')}
        stroke={g} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
      />

      {/* ── Arrow head at (44,4), 45° upper-right ── */}
      {/* tip(44,4)  base1(41,12)  base2(36,7)       */}
      <path d="M 44,4 L 41,12 L 36,7 Z" fill="#2ECC71" />
    </svg>
  );
}

// ── Public exports ────────────────────────────────────────────────────────────

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

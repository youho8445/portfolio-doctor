'use client';

import { useId } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PortraLogoProps {
  size?: number;
  showText?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}
export interface PortraSymbolProps { size?: number; className?: string; }
export interface PortraAppIconProps { size?: number; className?: string; }

// ── SVG symbol ────────────────────────────────────────────────────────────────
// viewBox 0 0 92 92
//
// Two arcs cross near center (~x=41) creating a circular-flow visual:
//
//  Arc 1 (outer): upper-left → sweeps far-left & down (counterclockwise)
//                 → lower-right. Forms the "outer shell" of the circle.
//
//  Arc 2 (inner): lower-left → curves diagonally up-right → arrow.
//                 Cuts through the outer arc, creating the X-crossing.
//
// At start (x≈18-22): Arc 1 is high (y=18), Arc 2 is low (y=70).
// At mid   (x≈60):    Arc 2 has risen above Arc 1 → they've crossed.
// → Crossing at x≈41, near center.  Creates the yin-yang flow effect.
//
// Gradient: purple(#6C5CE7) → blue(#2D9CDB) → green(#2ECC71), left→right

const VW = 92, VH = 92;

function Sym({ gid, size }: { gid: string; size: number }) {
  const g = `url(#${gid}g)`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${VW} ${VH}`} fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`${gid}g`} x1="4" y1="46" x2="88" y2="46"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6C5CE7" />
          <stop offset="50%"  stopColor="#2D9CDB" />
          <stop offset="100%" stopColor="#2ECC71" />
        </linearGradient>
      </defs>

      {/* ── Arc 1: outer sweep (upper-left → far-left/bottom → lower-right) ── */}
      {/* Sweeps counterclockwise ~270°, forming the circular outer shell */}
      <path
        d="M 22,18 C 6,30 6,62 22,76 C 38,90 66,84 78,68"
        stroke={g} strokeWidth="9" strokeLinecap="round"
      />

      {/* ── Arc 2: inner diagonal (lower-left → crosses Arc 1 → upper-right) ── */}
      {/* Continues beyond the circle as the upward arrow */}
      <path
        d="M 16,70 C 22,50 42,34 60,30 C 76,26 70,22 82,8"
        stroke={g} strokeWidth="9" strokeLinecap="round"
      />

      {/* ── Arrow head at (82,8) pointing ~50° upper-right ── */}
      {/* Direction: (82-70, 8-22) = (12,-14) ≈ 49° from horizontal */}
      <path d="M 82,8 L 79,21 L 70,13 Z" fill="#2ECC71" />
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
  const color = variant === 'dark' ? '#ffffff' : '#1E1257';
  const fontSize = Math.round(size * 0.72);
  const gap = Math.round(size * 0.25);

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
          fontFamily: 'var(--font-dm-sans), Inter, system-ui, sans-serif',
          fontSize,
          fontWeight: 700,
          color,
          letterSpacing: '-0.02em',
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
  const symbolSize = Math.round(size * 0.65);

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

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
// viewBox 0 0 90 90
//
// Two crossing S-curves with gradient stroke (no filled shapes):
//  Path 1: upper-left → lower-right  (outer arc, creates circular body)
//  Path 2: lower-left → upper-right  (inner wave, exits as arrow)
//
// Gradient: purple(#6C5CE7) → blue(#2D9CDB) → green(#2ECC71), left→right
//
// Paths cross near center (~46,42), creating the "flow through circle" visual.

const VW = 90, VH = 90;

function Sym({ gid, size }: { gid: string; size: number }) {
  const g = `url(#${gid}g)`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${VW} ${VH}`} fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`${gid}g`} x1="8" y1="45" x2="82" y2="45"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6C5CE7" />
          <stop offset="50%"  stopColor="#2D9CDB" />
          <stop offset="100%" stopColor="#2ECC71" />
        </linearGradient>
      </defs>

      {/* ── 1. Outer arc (upper-left → lower-right) ── */}
      <path
        d="M 16,24 C 8,42 14,68 34,76 C 52,84 72,76 78,60"
        stroke={g} strokeWidth="8" strokeLinecap="round"
      />

      {/* ── 2. Inner wave (lower-left → upper-right, becomes arrow) ── */}
      <path
        d="M 14,64 C 18,46 28,32 46,28 C 64,24 72,12 78,6"
        stroke={g} strokeWidth="8" strokeLinecap="round"
      />

      {/* ── 3. Arrow head at upper-right (45° angle, tip at 78,6) ── */}
      <path d="M 78,6 L 74,18 L 66,10 Z" fill="#2ECC71" />
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

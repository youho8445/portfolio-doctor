'use client';

import { useId } from 'react';

export interface PortflowLogoProps {
  height?: number;
  textColor?: string;
  dark?: boolean;
  className?: string;
}
export interface PortflowSymbolProps { size?: number; className?: string; }
export interface PortflowAppIconProps { size?: number; className?: string; }

// ── SVG symbol ────────────────────────────────────────────────────────────────
// viewBox 0 0 96 72
//
// Structure (back → front):
//  1. Filled circle  — gradient: purple(#7C5CE7) → teal(#0FC5B2), left→right
//  2. White flow paths — two crossing S-curves inside circle (white strokes)
//  3. Purple wave      — sinusoidal ~1.5 cycles, left of circle (#7C5CE7 stroke)
//  4. Green arrow      — large filled-head arrow, upper-right of circle
//
// Key coordinates (circle cx=50 cy=38 r=24):
//   left tangent  x=26   right tangent  x=74
//   top tangent   y=14   bottom         y=62
//   upper-right @ 42°: (50+24cos42°, 38-24sin42°) ≈ (68,22)

const VW = 96, VH = 72;

function Sym({ gid, size }: { gid: string; size: number }) {
  const w = Math.round((size * VW) / VH);
  const cg = `url(#${gid}c)`;   // circle fill gradient
  const wg = `url(#${gid}w)`;   // wave stroke gradient (purple left → teal right)

  return (
    <svg width={w} height={size} viewBox={`0 0 ${VW} ${VH}`} fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        {/* Circle gradient: purple (left) → teal (right) */}
        <linearGradient id={`${gid}c`} x1="26" y1="38" x2="74" y2="38"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7B5CE4" />
          <stop offset="55%"  stopColor="#1DB8C4" />
          <stop offset="100%" stopColor="#0FD4A8" />
        </linearGradient>

        {/* Purple wave gradient — same left-edge purple, fades into teal at circle entry */}
        <linearGradient id={`${gid}w`} x1="2" y1="38" x2="26" y2="38"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7B5CE4" />
          <stop offset="100%" stopColor="#7B5CE4" />
        </linearGradient>

        {/* Arrow gradient — teal → green */}
        <linearGradient id={`${gid}a`} x1="62" y1="30" x2="84" y2="8"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0FC5B2" />
          <stop offset="100%" stopColor="#2ECC71" />
        </linearGradient>
      </defs>

      {/* ── 1. Filled circle (main body) ── */}
      <circle cx="50" cy="38" r="24" fill={cg} />

      {/* ── 2. White flow paths (inside circle) ── */}
      {/* Two crossing S-curves: together they create the "flow" pattern */}
      {/* Upper path: goes from lower-left to upper-right of circle interior */}
      <path
        d="M 32,48 C 38,34 54,30 68,24"
        stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.92"
      />
      {/* Lower path: goes from upper-left to lower-right */}
      <path
        d="M 32,28 C 38,42 54,46 68,52"
        stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.92"
      />

      {/* ── 3. Purple sinusoidal wave (left, outside circle) ── */}
      {/* ~1.5 sine cycles from x=2 to x=26 (circle's left tangent) */}
      <path
        d="M 2,38 C 5,24 9,52 13,38 C 17,24 21,30 26,38"
        stroke={wg} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
      />

      {/* ── 4. Green arrow (upper-right, outside circle) ── */}
      {/* Arrow shaft: from near circle edge going upper-right */}
      <line
        x1="62" y1="28" x2="74" y2="14"
        stroke={`url(#${gid}a)`} strokeWidth="5" strokeLinecap="round"
      />
      {/* Arrow head: filled triangle pointing upper-right (≈45°)
          Tip: (82,8)  — upper-right corner
          The two base points form a right-angle arrowhead            */}
      <path
        d="M 70,8 L 82,8 L 82,20 Z"
        fill={`url(#${gid}a)`}
      />
    </svg>
  );
}

// ── Public exports ────────────────────────────────────────────────────────────

export function PortflowSymbol({ size = 36, className }: PortflowSymbolProps) {
  const raw = useId();
  return (
    <span className={className} style={{ display: 'inline-flex' }} aria-label="Portflow">
      <Sym gid={`pfsy${raw.replace(/\W/g, '')}`} size={size} />
    </span>
  );
}

export function PortflowLogo({ height = 36, textColor, dark = false, className }: PortflowLogoProps) {
  const raw = useId();
  const color = textColor ?? (dark ? '#ffffff' : '#1E1257');
  const fontSize = Math.round(height * 0.76);
  const gap = Math.round(height * 0.22);

  return (
    <div
      className={`flex items-center${className ? ` ${className}` : ''}`}
      style={{ gap }}
      role="img"
      aria-label="Portflow"
    >
      <Sym gid={`pflg${raw.replace(/\W/g, '')}`} size={height} />
      <span style={{
        fontFamily: 'var(--font-dm-sans), Inter, system-ui, sans-serif',
        fontSize,
        fontWeight: 700,
        color,
        letterSpacing: '-0.01em',
        lineHeight: 1,
        userSelect: 'none',
      }}>
        Portflow
      </span>
    </div>
  );
}

export function PortflowAppIcon({ size = 64, className }: PortflowAppIconProps) {
  const raw = useId();
  const symbolSize = Math.round(size * 0.62);

  return (
    <div
      className={className}
      role="img"
      aria-label="Portflow"
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.22),
        background: '#1A1446',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Sym gid={`pfic${raw.replace(/\W/g, '')}`} size={symbolSize} />
    </div>
  );
}

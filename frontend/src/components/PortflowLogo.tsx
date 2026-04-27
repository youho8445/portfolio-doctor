'use client';

import { useId } from 'react';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PortflowLogoProps {
  /** Symbol + text combined height. Default: 36 */
  height?: number;
  /** Override text color. Default: #1E1257 (light) / white (dark) */
  textColor?: string;
  /** Dark mode — text becomes white */
  dark?: boolean;
  className?: string;
}

export interface PortflowSymbolProps {
  /** Icon height. Default: 36 */
  size?: number;
  className?: string;
}

export interface PortflowAppIconProps {
  /** Square container size. Default: 64 */
  size?: number;
  className?: string;
}

// ── SVG constants ─────────────────────────────────────────────────────────────
// viewBox is 64 × 52 units.
// Key paths (all stroke, no fill):
//   • Wave  : S-curve from lower-left (3,44) → (34,24), passes into the circle
//   • Circle: cx=40 cy=26 r=14  (left edge at x=26, upper-right at ~50,16)
//   • Arrow : shaft (50,16)→(58,8) + L-shaped head at tip → indicates ↗
// Gradient : #6C5CE7(purple) → #4A90E2(blue) → #2ECC71(green)  lower-left→upper-right
const VW = 64;
const VH = 52;
const SW = '3.5'; // stroke-width at 52-unit viewBox ≈ 2.7 px at 40 px rendered height

function Sym({ gid, size }: { gid: string; size: number }) {
  const w = Math.round((size * VW) / VH);
  const g = `url(#${gid})`;

  return (
    <svg
      width={w}
      height={size}
      viewBox={`0 0 ${VW} ${VH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* gradient flows in the same direction as the visual "flow": lower-left → upper-right */}
        <linearGradient id={gid} x1="4" y1="48" x2="58" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6C5CE7" />
          <stop offset="48%"  stopColor="#4A90E2" />
          <stop offset="100%" stopColor="#2ECC71" />
        </linearGradient>
      </defs>

      {/* Circle ring — drawn first so wave appears to pass through it */}
      <circle cx="40" cy="26" r="14" stroke={g} strokeWidth={SW} />

      {/* S-curve wave — starts lower-left, flows into circle interior */}
      <path
        d="M 3,44 C 7,26 13,20 18,28 C 23,36 29,20 34,24"
        stroke={g}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Arrow shaft — exits circle at ~45° upper-right */}
      <line x1="50" y1="16" x2="58" y2="8" stroke={g} strokeWidth={SW} strokeLinecap="round" />

      {/* Arrow head — L-shape at tip, indicating ↗ direction */}
      <path
        d="M 52,8 L 58,8 L 58,14"
        stroke={g}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Public components ─────────────────────────────────────────────────────────

/** Symbol-only icon (no text) */
export function PortflowSymbol({ size = 36, className }: PortflowSymbolProps) {
  const raw = useId();
  return (
    <span className={className} style={{ display: 'inline-flex' }} aria-label="Portflow">
      <Sym gid={`pfsy${raw.replace(/\W/g, '')}`} size={size} />
    </span>
  );
}

/** Horizontal logo: symbol + "Portflow" text */
export function PortflowLogo({ height = 36, textColor, dark = false, className }: PortflowLogoProps) {
  const raw = useId();
  const color = textColor ?? (dark ? '#ffffff' : '#1E1257');
  const fontSize = Math.round(height * 0.74);
  const gap = Math.round(height * 0.25);

  return (
    <div
      className={`flex items-center${className ? ` ${className}` : ''}`}
      style={{ gap }}
      role="img"
      aria-label="Portflow"
    >
      <Sym gid={`pflg${raw.replace(/\W/g, '')}`} size={height} />
      <span
        style={{
          fontFamily: 'var(--font-dm-sans), Inter, system-ui, sans-serif',
          fontSize,
          fontWeight: 800,
          color,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        Portflow
      </span>
    </div>
  );
}

/** App-store icon: symbol on deep-purple rounded square */
export function PortflowAppIcon({ size = 64, className }: PortflowAppIconProps) {
  const raw = useId();
  const symbolSize = Math.round(size * 0.62);

  return (
    <div
      className={className}
      role="img"
      aria-label="Portflow"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: '#1A1446',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Sym gid={`pfic${raw.replace(/\W/g, '')}`} size={symbolSize} />
    </div>
  );
}

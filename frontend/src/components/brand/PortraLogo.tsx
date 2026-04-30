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

function Sym({ gid, size }: { gid: string; size: number }) {
  const g = `url(#${gid}g)`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`${gid}g`} x1="4" y1="44" x2="44" y2="4"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6C5CE7" />
          <stop offset="50%"  stopColor="#2D9CDB" />
          <stop offset="100%" stopColor="#2ECC71" />
        </linearGradient>
      </defs>

      {/* Area fill below the performance curve */}
      <path
        d="M 4,44 C 8,44 12,40 16,36 C 20,32 24,24 28,18 C 32,12 36,6 44,4 L 44,44 Z"
        fill={g} fillOpacity="0.55"
      />

      {/* Performance curve */}
      <path
        d="M 4,44 C 8,44 12,40 16,36 C 20,32 24,24 28,18 C 32,12 36,6 44,4"
        stroke={g} strokeWidth="3" strokeLinecap="round" fill="none"
      />

      {/* Peak indicator */}
      <circle cx="44" cy="4" r="3.5" fill="#2ECC71" />
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

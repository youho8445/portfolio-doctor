'use client';

import Image from 'next/image';

export interface PortraLogoProps {
  size?: number;
  showText?: boolean;
  showIcon?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}
export interface PortraSymbolProps { size?: number; className?: string; }
export interface PortraAppIconProps { size?: number; className?: string; }

export function PortraSymbol({ size = 36, className }: PortraSymbolProps) {
  return (
    <span className={className} style={{ display: 'inline-flex', flexShrink: 0 }} aria-label="Pobalance">
      <Image src="/portra-logo.png" width={Math.round(size * 1.5)} height={size} alt="Pobalance" style={{ objectFit: 'contain' }} />
    </span>
  );
}

export function PortraLogo({
  size = 36,
  showText = true,
  showIcon = true,
  variant = 'light',
  className,
}: PortraLogoProps) {
  const color = variant === 'dark' ? '#ffffff' : '#0f172a';
  const fontSize = Math.round(size * 0.36);
  const gap = Math.max(6, Math.round(size * 0.1));

  return (
    <div
      className={`flex items-center${className ? ` ${className}` : ''}`}
      style={{ gap }}
      role="img"
      aria-label="Pobalance"
    >
      {showIcon && <Image src="/portra-logo.png" width={Math.round(size * 1.5)} height={size} alt="Pobalance" style={{ objectFit: 'contain', flexShrink: 0 }} />}
      {showText && (
        <span style={{
          fontFamily: 'var(--font-dm-sans), Inter, -apple-system, sans-serif',
          fontSize,
          fontWeight: 700,
          color,
          letterSpacing: '-0.025em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}>
          Pobalance
        </span>
      )}
    </div>
  );
}

export function PortraAppIcon({ size = 64, className }: PortraAppIconProps) {
  return (
    <div
      className={className}
      role="img"
      aria-label="Pobalance"
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.22),
        background: '#f0f4ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <Image src="/portra-logo.png" width={size} height={size} alt="Pobalance" style={{ objectFit: 'contain' }} />
    </div>
  );
}

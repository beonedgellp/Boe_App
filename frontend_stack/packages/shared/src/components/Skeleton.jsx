import React from 'react';

/**
 * Skeleton — loading placeholder with staggered pulse.
 *
 * Props:
 *   - variant: 'text' | 'card' | 'circle' | 'rect' (default 'text')
 *   - width: string | number (css width)
 *   - height: string | number (css height)
 *   - count: number (repeat count, default 1)
 *   - delay: number (stagger delay in ms, default 80)
 *   - className: string
 *   - style: object
 */
export default function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  delay = 80,
  className = '',
  style = {},
}) {
  const baseStyle = {
    background: 'var(--be-slate-soft)',
    borderRadius: variant === 'circle' ? '50%' : 'var(--be-radius-sm)',
    width: width ?? (variant === 'text' ? '100%' : undefined),
    height: height ?? (variant === 'text' ? '14px' : variant === 'circle' ? '40px' : '80px'),
    ...style,
  };

  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`be-skeleton ${className}`}
      style={{
        ...baseStyle,
        animationDelay: `${i * delay}ms`,
      }}
      aria-hidden="true"
    />
  ));

  return (
    <>
      {items}
      <style>{`
        @keyframes be-skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .be-skeleton {
          animation: be-skeleton-pulse 1.6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .be-skeleton { animation: none; opacity: 0.7; }
        }
      `}</style>
    </>
  );
}

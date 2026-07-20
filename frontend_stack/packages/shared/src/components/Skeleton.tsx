import React from 'react';
import './Skeleton.css';

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
}: any) {
  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`be-skeleton be-skeleton--${variant} ${className}`}
      style={{
        width,
        height,
        animationDelay: `${i * delay}ms`,
        ...style,
      }}
      aria-hidden="true"
    />
  ));

  return <>{items}</>;
}

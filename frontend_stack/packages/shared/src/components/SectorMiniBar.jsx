import React from 'react';

/**
 * Horizontal stacked bar showing sector distribution.
 * Used in client FundCards and admin table rows.
 */
export function SectorMiniBar({ sectors, height = 6, className = '', animate = true, style }) {
  const validSectors = (sectors || []).filter((s) => s.percentage > 0);
  if (validSectors.length === 0) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height,
          borderRadius: height / 2,
          background: 'var(--be-border)',
          ...style,
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        width: '100%',
        height,
        borderRadius: height / 2,
        overflow: 'hidden',
        background: 'var(--be-border)',
        ...style,
      }}
    >
      {validSectors.map((s, i) => (
        <div
          key={s.id || i}
          style={{
            width: `${s.percentage}%`,
            height: '100%',
            background: s.color || 'var(--be-slate)',
          }}
          title={`${s.name || 'Unnamed'}: ${s.percentage}%`}
        />
      ))}
    </div>
  );
}

/**
 * Compact version for table rows and small spaces.
 */
export function SectorMiniBarCompact({ sectors, width = 80, height = 6 }) {
  return (
    <SectorMiniBar
      sectors={sectors}
      height={height}
      style={{ width, flexShrink: 0 }}
    />
  );
}

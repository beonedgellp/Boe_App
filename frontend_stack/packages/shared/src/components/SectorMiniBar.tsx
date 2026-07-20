import React from 'react';

const EMPTY_BAR_STYLE = {
  width: '100%',
  borderRadius: 'var(--be-radius-pill)',
  background: 'var(--be-border)',
};

const STACK_STYLE = {
  display: 'flex',
  width: '100%',
  borderRadius: 'var(--be-radius-pill)',
  overflow: 'hidden',
  background: 'var(--be-border)',
};

const SEGMENT_STYLE = {
  height: '100%',
  minWidth: '2px',
};

/**
 * Horizontal stacked bar showing sector distribution.
 * Used in client FundCards and admin table rows.
 */
export function SectorMiniBar({ sectors, height = 6, className = '', style }: any) {
  const validSectors = (sectors || []).filter((s) => s.percentage > 0);
  if (validSectors.length === 0) {
    return (
      <div
        className={className}
        style={{
          ...EMPTY_BAR_STYLE,
          height,
          ...style,
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        ...STACK_STYLE,
        height,
        ...style,
      }}
    >
      {validSectors.map((s, i) => (
        <div
          key={s.id || i}
          style={{
            ...SEGMENT_STYLE,
            width: `${s.percentage}%`,
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
export function SectorMiniBarCompact({ sectors, width = 80, height = 6 }: any) {
  return (
    <SectorMiniBar
      sectors={sectors}
      height={height}
      style={{ width, flexShrink: 0 }}
    />
  );
}

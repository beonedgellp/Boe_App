import React from 'react';
import { fmtDate } from '../format.js';

const SOURCE_META = {
  real: { dotColor: 'var(--be-green)', label: 'Live data' },
  mock: { dotColor: 'var(--be-amber)', label: 'Test data' },
  derived: { dotColor: 'var(--be-blue)', label: 'Computed' },
  stale: { dotColor: 'var(--be-red)', label: 'Stale' },
};

export default function DataFreshnessBadge({ source, asOf, stale, className = '' }) {
  const meta = SOURCE_META[stale ? 'stale' : source] || SOURCE_META.mock;
  const dateStr = asOf ? fmtDate(asOf) : '';

  return (
    <span
      className={`be-freshness-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '10px',
        fontWeight: 500,
        letterSpacing: '0.02em',
        flexWrap: 'wrap',
      }}
    >
      <span
        className="be-freshness-dot"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '999px',
          background: meta.dotColor,
          flexShrink: 0,
        }}
      />
      <span>{stale && dateStr ? `Stale — as of ${dateStr}` : meta.label}</span>
      {!stale && asOf && (
        <span style={{ color: 'var(--be-slate)', fontWeight: 400 }}>
          {fmtDate(asOf)}
        </span>
      )}
    </span>
  );
}

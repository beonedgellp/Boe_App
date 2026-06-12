import React from 'react';
import './DataFreshnessBadge.css';
import { fmtDate } from '../format.js';

const SOURCE_META = {
  real: { dotColor: 'var(--be-green)', label: 'Live data' },
  mock: { dotColor: 'var(--be-amber)', label: 'Test data' },
  derived: { dotColor: 'var(--be-slate)', label: 'Computed' },
  stale: { dotColor: 'var(--be-red)', label: 'Stale' },
};

export default function DataFreshnessBadge({ source, asOf, stale, className = '' }) {
  const meta = SOURCE_META[stale ? 'stale' : source] || SOURCE_META.mock;
  const dateStr = asOf ? fmtDate(asOf) : '';

  return (
    <span className={`be-freshness-badge ${className}`}>
      <span
        className="be-freshness-dot"
        style={{ background: meta.dotColor }}
      />
      <span>{stale && dateStr ? `Stale — as of ${dateStr}` : meta.label}</span>
      {!stale && asOf && (
        <span className="be-freshness-date">
          {fmtDate(asOf)}
        </span>
      )}
    </span>
  );
}

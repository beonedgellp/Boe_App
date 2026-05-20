import React from 'react';
import { riskToLabel, riskToTone, lifecycleDisplayLabel, lifecycleTone } from '../riskMapping.js';

/* ------------------------------------------------------------------ */
/* RiskBadge                                                          */
/* ------------------------------------------------------------------ */

const RISK_BADGE_STYLES = {
  growth: { background: 'var(--be-red-soft)', color: 'var(--be-red)' },
  balanced: { background: 'var(--be-amber-soft)', color: 'var(--be-amber)' },
  conservative: { background: 'var(--be-green-soft)', color: 'var(--be-green)' },
};

export function RiskBadge({ riskLabel, size = 'md' }) {
  const label = riskToLabel(riskLabel);
  const tone = riskToTone(riskLabel);
  const style = RISK_BADGE_STYLES[tone];
  const padding = size === 'sm' ? '2px 8px' : '3px 10px';
  const fontSize = size === 'sm' ? '10px' : '11px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding,
        borderRadius: '999px',
        fontSize,
        fontWeight: 500,
        letterSpacing: '0.02em',
        ...style,
      }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* LifecycleBadge                                                     */
/* ------------------------------------------------------------------ */

const LIFECYCLE_BADGE_STYLES = {
  slate: { background: 'rgba(92,100,112,0.12)', color: 'var(--be-slate)' },
  gold: { background: 'var(--be-gold-soft)', color: 'var(--be-gold-2)' },
  green: { background: 'var(--be-green-soft)', color: 'var(--be-green)' },
  amber: { background: 'var(--be-amber-soft)', color: 'var(--be-amber)' },
  red: { background: 'var(--be-red-soft)', color: 'var(--be-red)' },
};

export function LifecycleBadge({ stage, size = 'md' }) {
  const label = lifecycleDisplayLabel(stage);
  const tone = lifecycleTone(stage);
  const style = LIFECYCLE_BADGE_STYLES[tone];
  const padding = size === 'sm' ? '2px 8px' : '3px 10px';
  const fontSize = size === 'sm' ? '10px' : '11px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding,
        borderRadius: '999px',
        fontSize,
        fontWeight: 500,
        letterSpacing: '0.02em',
        ...style,
      }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* StatusBadge                                                        */
/* ------------------------------------------------------------------ */

export function StatusBadge({ status, size = 'md' }) {
  const isActive = status === 'active';
  const label = isActive ? 'Active' : 'Coming Soon';
  const dotColor = isActive ? 'var(--be-green)' : 'var(--be-gold)';
  const padding = size === 'sm' ? '2px 8px' : '3px 10px';
  const fontSize = size === 'sm' ? '10px' : '11px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding,
        borderRadius: '999px',
        fontSize,
        fontWeight: 500,
        letterSpacing: '0.02em',
        background: isActive ? 'var(--be-green-soft)' : 'var(--be-gold-soft)',
        color: isActive ? 'var(--be-green)' : 'var(--be-gold-2)',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '999px',
          background: dotColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}


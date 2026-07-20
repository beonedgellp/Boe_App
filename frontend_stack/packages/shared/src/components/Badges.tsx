import React from 'react';
import './Badges.css';
import { riskToLabel, riskToTone, lifecycleDisplayLabel, lifecycleTone } from '../riskMapping.ts';

/* ------------------------------------------------------------------ */
/* RiskBadge                                                          */
/* ------------------------------------------------------------------ */

export function RiskBadge({ riskLabel, size = 'md' }) {
  const label = riskToLabel(riskLabel);
  const tone = riskToTone(riskLabel);

  return (
    <span className={`be-shared-badge be-shared-badge--${size} be-risk-badge--${tone}`}>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* LifecycleBadge                                                     */
/* ------------------------------------------------------------------ */

export function LifecycleBadge({ stage, size = 'md' }) {
  const label = lifecycleDisplayLabel(stage);
  const tone = lifecycleTone(stage);

  return (
    <span className={`be-shared-badge be-shared-badge--${size} be-lifecycle-badge--${tone}`}>
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

  return (
    <span className={`be-shared-badge be-shared-badge--${size} be-status-badge--${isActive ? 'active' : 'soon'}`}>
      <span
        className="be-shared-badge__dot"
        style={{ background: dotColor }}
      />
      {label}
    </span>
  );
}

/**
 * Shared risk label mapping utilities.
 * Ensures consistent risk display across admin and client sides.
 */

export const RISK_LABEL_MAP = {
  high: 'Growth',
  moderate_high: 'Growth',
  moderate: 'Balanced',
  low_moderate: 'Balanced',
  low: 'Conservative',
};

export const RISK_ORDER = ['high', 'moderate_high', 'moderate', 'low_moderate', 'low'];

export const RISK_GROUP_ORDER = ['Growth', 'Balanced', 'Conservative'];

/**
 * Map a backend risk label to a client-facing category name.
 * @param {string} riskLabel
 * @returns {'Growth' | 'Balanced' | 'Conservative' | 'Balanced'}
 */
export function riskToLabel(riskLabel) {
  return RISK_LABEL_MAP[riskLabel] || 'Balanced';
}

/**
 * Get the CSS color class suffix for a risk label.
 * Used by badges and visual indicators.
 * @param {string} riskLabel
 * @returns {'growth' | 'balanced' | 'conservative'}
 */
export function riskToTone(riskLabel) {
  const label = riskToLabel(riskLabel);
  if (label === 'Growth') return 'growth';
  if (label === 'Conservative') return 'conservative';
  return 'balanced';
}

/**
 * Lifecycle stage display label.
 * @param {string} stage
 * @returns {string}
 */
export function lifecycleDisplayLabel(stage) {
  const map = {
    draft: 'Draft',
    published: 'Published',
    active: 'Active',
    paused: 'Paused',
    closed: 'Closed',
    archived: 'Archived',
  };
  return map[stage] || stage;
}

/**
 * Lifecycle stage visual tone for badges.
 * @param {string} stage
 * @returns {'slate' | 'gold' | 'green' | 'amber' | 'red' | 'slate'}
 */
export function lifecycleTone(stage) {
  const map = {
    draft: 'slate',
    published: 'gold',
    active: 'green',
    paused: 'amber',
    closed: 'red',
    archived: 'slate',
  };
  return map[stage] || 'slate';
}

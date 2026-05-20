export const TAX_REGIMES = {
  'pre_2024_07_23': {
    effectiveFrom: '2024-07-23',
    stcgRate: 0.15,
    stcgSection: '111A',
    ltcgRate: 0.10,
    ltcgSection: '112A',
    ltcgExemptionLimit: 100000,
    sttRate: 0.00001,
    holdingPeriodCutoffMonths: 12,
    description: 'Pre-23 July 2024 regime'
  },
  'post_2024_07_23': {
    effectiveFrom: '2024-07-23',
    stcgRate: 0.20,
    stcgSection: '111A',
    ltcgRate: 0.125,
    ltcgSection: '112A',
    ltcgExemptionLimit: 125000,
    sttRate: 0.00001,
    holdingPeriodCutoffMonths: 12,
    description: 'Post-23 July 2024 regime (Finance Act 2024)'
  }
};

import { istDateObject } from '../utils/istDate.js';

export function getTaxRegimeForDate(date = new Date()) {
  const cutoff = istDateObject(new Date('2024-07-23'));
  const d = istDateObject(date);
  return d >= cutoff ? TAX_REGIMES.post_2024_07_23 : TAX_REGIMES.pre_2024_07_23;
}

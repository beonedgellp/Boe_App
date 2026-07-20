import React from 'react';
import { formatMoney } from '../format.ts';
import DataFreshnessBadge from './DataFreshnessBadge.tsx';

const WRAPPER_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--be-space-1)',
  flexWrap: 'wrap',
};

export default function MoneyValue({
  amount,
  source,
  asOf,
  currency = 'INR',
  showBadge = true,
  decimals = 0,
  sign = false,
}) {
  const formatted = formatMoney(amount, { source, asOf, currency, decimals, sign });
  return (
    <span
      className="be-money-value"
      style={WRAPPER_STYLE}
    >
      <span className="be-money">{formatted.display}</span>
      {showBadge && (
        <DataFreshnessBadge source={formatted.source} asOf={formatted.asOf} />
      )}
    </span>
  );
}

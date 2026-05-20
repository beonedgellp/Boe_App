import React from 'react';
import { formatMoney } from '../format.js';
import DataFreshnessBadge from './DataFreshnessBadge.jsx';

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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
      }}
    >
      <span className="be-money">{formatted.display}</span>
      {showBadge && (
        <DataFreshnessBadge source={formatted.source} asOf={formatted.asOf} />
      )}
    </span>
  );
}

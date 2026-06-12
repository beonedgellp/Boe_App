import React from 'react';
import { fmtMoney } from '../format.js';
import './CurrencyCell.css';

/**
 * CurrencyCell — formatted money value for table cells.
 *
 * Props:
 *   - amount: number
 *   - currency: string (default 'INR')
 *   - decimals: number (default 0)
 *   - sign: boolean (default false)
 *   - className: string
 */
export default function CurrencyCell({
  amount,
  currency = 'INR',
  decimals = 0,
  sign = false,
  className = '',
}) {
  const isEmpty = amount === null || amount === undefined || Number.isNaN(amount);
  const value = isEmpty ? '—' : fmtMoney(amount, { currency, decimals, sign });
  const muted = isEmpty || Number(amount) === 0;

  return (
    <span
      className={`be-currency-cell be-money ${muted ? 'be-currency-cell--muted' : ''} ${className}`}
    >
      {value}
    </span>
  );
}

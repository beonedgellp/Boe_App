import React from 'react';
import { fmtDate, relativeDay } from '../format.js';
import './DateCell.css';

/**
 * DateCell — formatted date (with optional relative label) for table cells.
 *
 * Props:
 *   - date: string | Date | number
 *   - withTime: boolean (default false)
 *   - relative: boolean (default false)
 *   - className: string
 */
export default function DateCell({
  date,
  withTime = false,
  relative = false,
  className = '',
}) {
  const formatted = fmtDate(date, { withTime });
  const rel = relative ? relativeDay(date) : null;

  return (
    <span className={`be-date-cell ${className}`}>
      <span className="be-date-cell__date">{formatted}</span>
      {rel && <span className="be-date-cell__relative">{rel}</span>}
    </span>
  );
}

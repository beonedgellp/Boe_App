import React from 'react';
import './ContentGrid.css';

/**
 * ContentGrid — responsive grid for cards, stats, quick links, etc.
 *
 * Replaces .ash-stat-grid, .ash-quicklink-grid, .adm-stats, .adm-grid-2.
 * Uses CSS Grid with auto-fit so columns collapse naturally.
 *
 * @param {number|'responsive'} cols — 1-6 or 'responsive' (default)
 */
export default function ContentGrid({
  children,
  className = '',
  cols = 'responsive',
  gap,
  minColWidth = '240px',
  as: Tag = 'div',
  ...rest
}) {
  const style = {};
  if (gap) style['--grid-gap'] = gap;
  if (minColWidth) style['--grid-min-col'] = minColWidth;

  const validCols = typeof cols === 'number' && Number.isInteger(cols) && cols >= 1 && cols <= 6;
  const colClass = validCols
    ? `be-grid--${cols}`
    : cols === 'responsive'
    ? 'be-grid--responsive'
    : 'be-grid--responsive';

  return (
    <Tag
      className={`be-content-grid ${colClass} ${className}`}
      style={Object.keys(style).length ? style : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

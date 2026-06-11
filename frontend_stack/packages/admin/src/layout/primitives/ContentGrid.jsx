import React from 'react';
import './ContentGrid.css';

/**
 * ContentGrid — responsive grid for cards, stats, quick links, etc.
 *
 * Replaces .ash-stat-grid, .ash-quicklink-grid, .adm-stats, .adm-grid-2.
 * Uses CSS Grid with auto-fit so columns collapse naturally.
 */
export default function ContentGrid({
  children,
  className = '',
  cols = 'responsive',
  gap,
  minColWidth = '240px',
  as: Tag = 'div',
}) {
  const style = {};
  if (gap) style['--grid-gap'] = gap;
  if (minColWidth) style['--grid-min-col'] = minColWidth;

  const colClass =
    typeof cols === 'number'
      ? `be-grid--${cols}`
      : cols === 'responsive'
      ? 'be-grid--responsive'
      : '';

  return (
    <Tag
      className={`be-content-grid ${colClass} ${className}`}
      style={Object.keys(style).length ? style : undefined}
    >
      {children}
    </Tag>
  );
}

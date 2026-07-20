import React from 'react';
import './Page.css';

/**
 * Page — unified page container.
 *
 * Replaces .ash-page and .adm-screen with a single primitive that
 * respects the design-token spacing scale and responsive rules.
 *
 * Variants:
 *   bleed    — remove max-width constraint
 *   compact  — tighter gaps for dense data screens
 *   padded   — keep vertical/horizontal padding (default true)
 */
export default function Page({
  children,
  className = '',
  bleed = false,
  compact = false,
  padded = true,
  maxWidth,
  padding,
  gap,
  as: Tag = 'div',
  ...rest
}: any) {
  const style = {};
  if (maxWidth) style['--page-max-w'] = maxWidth;
  if (padding) style['--page-pad'] = padding;
  if (gap) style['--page-gap'] = gap;

  const classes = [
    'be-page',
    bleed ? 'is-bleed' : '',
    compact ? 'is-compact' : '',
    padded ? 'is-padded' : 'is-unpadded',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Tag
      className={classes}
      style={Object.keys(style).length ? style : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

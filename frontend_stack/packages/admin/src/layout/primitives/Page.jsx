import React from 'react';
import './Page.css';

/**
 * Page — unified page container.
 *
 * Replaces .ash-page and .adm-screen with a single primitive that
 * respects the design-token spacing scale and responsive rules.
 */
export default function Page({
  children,
  className = '',
  maxWidth,
  padding,
  gap,
  as: Tag = 'div',
}) {
  const style = {};
  if (maxWidth) style['--page-max-w'] = maxWidth;
  if (padding) style['--page-pad'] = padding;
  if (gap) style['--page-gap'] = gap;

  return (
    <Tag
      className={`be-page ${className}`}
      style={Object.keys(style).length ? style : undefined}
    >
      {children}
    </Tag>
  );
}

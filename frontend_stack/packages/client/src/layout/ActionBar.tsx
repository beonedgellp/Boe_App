import React from 'react';

export default function ActionBar({
  children,
  className = '',
  single = false,
  anchored = false,
  ...rest
}: any) {
  const classes = [
    'be-action-bar',
    single && 'be-action-bar--single',
    anchored && 'be-action-bar--anchored',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

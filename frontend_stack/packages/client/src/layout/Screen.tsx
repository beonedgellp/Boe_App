import React from 'react';

export default function Screen({ children, className = '', flush = false, ...rest }: any) {
  const classes = ['be-screen', flush && 'be-screen--flush', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

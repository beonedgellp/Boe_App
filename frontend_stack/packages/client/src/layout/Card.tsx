import React from 'react';

const variantClasses = {
  padded: 'be-card--padded',
  flush: 'be-card--flush',
  action: 'be-card--action',
  highlight: 'be-card--highlight',
  interactive: 'be-card--interactive',
};

export default function Card({
  children,
  variant = 'padded',
  as: Component = 'div',
  className = '',
  ...rest
}) {
  const classes = ['be-card', variantClasses[variant] || '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}

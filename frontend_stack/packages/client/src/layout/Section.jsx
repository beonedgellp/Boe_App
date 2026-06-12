import React from 'react';

export default function Section({ children, title, className = '', ...rest }) {
  const classes = ['be-section', className].filter(Boolean).join(' ');
  return (
    <section className={classes} {...rest}>
      {title && <h2 className="be-section__title">{title}</h2>}
      {children}
    </section>
  );
}

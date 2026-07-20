import React from 'react';

export default function PageHeader({ eyebrow, title, actions, className = '', ...rest }) {
  const classes = ['be-page-header', className].filter(Boolean).join(' ');
  return (
    <header className={classes} {...rest}>
      <div className="be-page-header__text">
        {eyebrow && <span className="be-page-header__eyebrow">{eyebrow}</span>}
        <h1 className="be-page-header__title">{title}</h1>
      </div>
      {actions && <div className="be-page-header__actions">{actions}</div>}
    </header>
  );
}

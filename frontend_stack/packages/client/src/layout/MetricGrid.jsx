import React from 'react';

const colsClass = {
  2: 'be-metric-grid--2',
  4: 'be-metric-grid--4',
  stacked: 'be-metric-grid--stacked',
};

export function MetricGrid({ children, cols = 2, className = '', ...rest }) {
  const classes = ['be-metric-grid', colsClass[cols] || colsClass[2], className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

export function Metric({ label, value, className = '', ...rest }) {
  const classes = ['be-metric', className].filter(Boolean).join(' ');
  return (
    <div className={classes} {...rest}>
      <span className="be-metric__label">{label}</span>
      <span className="be-metric__value">{value}</span>
    </div>
  );
}

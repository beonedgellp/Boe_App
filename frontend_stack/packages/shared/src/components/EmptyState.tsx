import React from 'react';
import './EmptyState.css';

/**
 * EmptyState — teaches the interface when there is no data.
 *
 * Props:
 *   - icon: ReactNode (e.g. a Lucide icon)
 *   - title: string
 *   - description: string
 *   - action: ReactNode (optional button/link)
 *   - className: string
 *   - style: object
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
  style = {},
}: any) {
  return (
    <div
      className={`be-empty-state ${className}`}
      style={style}
    >
      {icon && (
        <div className="be-empty-state__icon-wrap">
          {icon}
        </div>
      )}
      {title && (
        <h3 className="be-empty-state__title">
          {title}
        </h3>
      )}
      {description && (
        <p className="be-empty-state__description">
          {description}
        </p>
      )}
      {action && <div className="be-empty-state__action">{action}</div>}
    </div>
  );
}

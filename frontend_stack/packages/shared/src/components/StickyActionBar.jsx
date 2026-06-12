import React from 'react';
import './StickyActionBar.css';

/**
 * StickyActionBar — sticky bar for bulk actions or table/list actions.
 *
 * Props:
 *   - children: ReactNode (primary label, e.g. "3 selected")
 *   - actions: ReactNode (buttons)
 *   - className: string
 */
export default function StickyActionBar({
  children,
  actions,
  className = '',
}) {
  return (
    <div className={`be-sticky-action-bar ${className}`}>
      <div className="be-sticky-action-bar__content">
        {children}
      </div>
      {actions && (
        <div className="be-sticky-action-bar__actions">
          {actions}
        </div>
      )}
    </div>
  );
}

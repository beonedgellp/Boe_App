import React from 'react';

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
}) {
  return (
    <div
      className={`be-empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '12px',
        padding: '32px 24px',
        color: 'var(--be-fg)',
        ...style,
      }}
    >
      {icon && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: 'var(--be-radius-lg)',
            background: 'var(--be-gold-soft)',
            color: 'var(--be-gold)',
            marginBottom: '4px',
          }}
        >
          {icon}
        </div>
      )}
      {title && (
        <h3
          style={{
            fontFamily: 'var(--be-font-sans)',
            fontSize: 'var(--be-text-lg)',
            fontWeight: 600,
            lineHeight: 'var(--be-lh-snug)',
            margin: 0,
          }}
        >
          {title}
        </h3>
      )}
      {description && (
        <p
          style={{
            fontSize: 'var(--be-text-sm)',
            color: 'var(--be-fg-muted)',
            lineHeight: 'var(--be-lh-normal)',
            maxWidth: '36ch',
            margin: 0,
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
}

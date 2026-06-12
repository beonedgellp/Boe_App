import React from 'react';
import { ErrorBoundary } from '@beonedge/shared/components/ErrorBoundary.jsx';

function Fallback() {
  return (
    <div
      role="alert"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--be-space-6)',
        background: 'var(--be-bg)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--be-container-reading)',
          width: '100%',
          background: 'var(--be-surface)',
          color: 'var(--be-fg)',
          border: 'var(--be-border-1)',
          borderRadius: 'var(--be-radius-lg)',
          padding: 'var(--be-space-8)',
          textAlign: 'center',
          boxShadow: 'var(--be-shadow-2)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 'var(--be-space-10)',
            height: 'var(--be-space-10)',
            borderRadius: '50%',
            background: 'var(--be-red-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--be-space-5)',
            fontSize: 'var(--be-text-2xl)',
          }}
        >
          ⚠️
        </div>
        <h1
          style={{
            margin: '0 0 var(--be-space-2)',
            fontFamily: 'var(--be-font-serif)',
            fontSize: 'var(--be-text-xl)',
            fontWeight: 600,
            color: 'var(--be-fg)',
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            margin: '0 0 var(--be-space-6)',
            fontSize: 'var(--be-text-base)',
            color: 'var(--be-fg-muted)',
            lineHeight: 'var(--be-lh-relaxed)',
          }}
        >
          We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: 'var(--be-space-3) var(--be-space-6)',
            borderRadius: 'var(--be-radius-md)',
            border: 'none',
            background: 'var(--be-ink)',
            color: 'var(--be-ivory)',
            fontFamily: 'var(--be-font-sans)',
            fontSize: 'var(--be-text-sm)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Refresh page
        </button>
      </div>
    </div>
  );
}

export default function RootErrorBoundary({ children }) {
  return (
    <ErrorBoundary fallback={<Fallback />}>
      {children}
    </ErrorBoundary>
  );
}

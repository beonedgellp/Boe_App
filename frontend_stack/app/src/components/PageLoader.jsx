import React from 'react';
import './PageLoader.css';

export default function PageLoader() {
  return (
    <div className="be-page-loader" role="status" aria-live="polite" aria-label="Loading page">
      <span className="be-page-loader__spinner" aria-hidden="true" />
      <span className="be-page-loader__label">Loading…</span>
    </div>
  );
}

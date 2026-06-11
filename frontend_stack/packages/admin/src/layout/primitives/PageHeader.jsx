import React from 'react';
import './PageHeader.css';

/**
 * PageHeader — unified page title bar.
 *
 * Replaces .ash-top-heading and .adm-top title patterns.
 * Merges the 18px ash style and 28px serif adm style into a single
 * 20px sans authoritative header.
 */
export default function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  className = '',
}) {
  return (
    <header className={`be-page-header ${className}`}>
      <div className="be-page-header-main">
        {breadcrumbs.length > 0 && (
          <nav className="be-breadcrumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb}-${index}`} className="be-breadcrumb-item">
                {index > 0 && (
                  <span className="be-breadcrumb-sep" aria-hidden="true">/</span>
                )}
                <span className={index === breadcrumbs.length - 1 ? 'is-active' : ''}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        )}
        <h1 className="be-page-header-title">{title}</h1>
        {subtitle && <p className="be-page-header-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className="be-page-header-actions">{actions}</div>
      )}
    </header>
  );
}

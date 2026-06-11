import React from 'react';
import './Section.css';

/**
 * Section — consistent section spacing and title styling.
 *
 * Replaces .ash-section-title + arbitrary gap wrappers.
 */
export default function Section({
  title,
  subtitle,
  children,
  className = '',
  titleAs: TitleTag = 'h2',
  id,
}) {
  return (
    <section className={`be-section ${className}`} id={id}>
      {(title || subtitle) && (
        <div className="be-section-header">
          {title && (
            <TitleTag className="be-section-title">{title}</TitleTag>
          )}
          {subtitle && (
            <p className="be-section-subtitle">{subtitle}</p>
          )}
        </div>
      )}
      <div className="be-section-body">{children}</div>
    </section>
  );
}

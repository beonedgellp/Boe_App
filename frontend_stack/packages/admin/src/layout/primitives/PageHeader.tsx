import { Link } from 'react-router-dom';
import './PageHeader.css';

/**
 * PageHeader — unified page title bar.
 *
 * Replaces .ash-top-heading and .adm-top title patterns.
 * Merges the 18px ash style and 28px serif adm style into a single
 * 20px sans authoritative header.
 */
function normalizeCrumb(crumb) {
  if (typeof crumb === 'string') return { label: crumb, to: null };
  if (crumb && typeof crumb === 'object') {
    return { label: crumb.label || '', to: crumb.to || null };
  }
  return { label: String(crumb), to: null };
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  className = '',
  ...rest
}: any) {
  const normalized = breadcrumbs.map(normalizeCrumb);

  return (
    <header className={`be-page-header ${className}`} {...rest}>
      <div className="be-page-header-main">
        {normalized.length > 0 && (
          <nav className="be-breadcrumbs" aria-label="Breadcrumb">
            {normalized.map((crumb, index) => {
              const isLast = index === normalized.length - 1;
              const key = `${crumb.label}-${index}`;
              return (
                <span key={key} className="be-breadcrumb-item">
                  {index > 0 && (
                    <span className="be-breadcrumb-sep" aria-hidden="true">/</span>
                  )}
                  {isLast || !crumb.to ? (
                    <span className={isLast ? 'is-active' : ''}>{crumb.label}</span>
                  ) : (
                    <Link className="be-breadcrumb-link" to={crumb.to}>{crumb.label}</Link>
                  )}
                </span>
              );
            })}
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

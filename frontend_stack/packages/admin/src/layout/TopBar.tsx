import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import I from '../components/I.tsx';

function normalizeCrumb(crumb) {
  if (typeof crumb === 'string') return { label: crumb, to: null };
  if (crumb && typeof crumb === 'object') {
    return { label: crumb.label || '', to: crumb.to || null };
  }
  return { label: String(crumb), to: null };
}

export default function TopBar({ title, breadcrumbs, crumbPaths, onLogout }) {
  const normalized = (breadcrumbs || []).map(normalizeCrumb);
  const paths = crumbPaths || normalized.map((crumb) => crumb.to);

  return (
    <header className="ash-top">
      <div className="ash-top-heading">
        <nav className="ash-bread" aria-label="Breadcrumb">
          {normalized.map((crumb, index) => {
            const isLast = index === normalized.length - 1;
            const path = paths[index];
            const key = `${crumb.label}-${index}`;
            return (
              <span key={key}>
                {index > 0 && <span className="ash-bread-sep" aria-hidden="true">/</span>}
                {isLast || !path ? (
                  <span className={isLast ? 'is-active' : ''}>{crumb.label}</span>
                ) : (
                  <Link className="ash-bread-link" to={path}>{crumb.label}</Link>
                )}
              </span>
            );
          })}
        </nav>
        <h1 className="ash-top-title">{title}</h1>
      </div>
      <div className="ash-top-actions">
        <button type="button" className="ash-btn ash-btn-secondary ash-btn-sm" onClick={onLogout}>
          <I icon={LogOut} size={14} />
          Log out
        </button>
      </div>
    </header>
  );
}

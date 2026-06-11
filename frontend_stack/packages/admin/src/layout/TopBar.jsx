import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import I from '../components/I.jsx';

export default function TopBar({ title, breadcrumbs, crumbPaths, onLogout }) {
  const paths = crumbPaths || breadcrumbs.map(() => null);
  return (
    <header className="ash-top">
      <div className="ash-top-heading">
        <nav className="ash-bread" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const path = paths[index];
            return (
              <span key={`${crumb}-${index}`}>
                {index > 0 && <span className="ash-bread-sep" aria-hidden="true">/</span>}
                {isLast || !path ? (
                  <span className={isLast ? 'is-active' : ''}>{crumb}</span>
                ) : (
                  <Link className="ash-bread-link" to={path}>{crumb}</Link>
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

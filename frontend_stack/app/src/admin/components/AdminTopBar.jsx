import { Search, Bell, LogOut } from 'lucide-react';
import I from './I.jsx';

export default function AdminTopBar({ title, breadcrumbs, onLogout }) {
  return (
    <header className="adm-top">
      <div>
        <div className="adm-bread">
          {breadcrumbs.map((b, i) => (
            <span key={i}>
              {i > 0 && <span className="adm-bread-sep">/</span>}
              <span className={i === breadcrumbs.length - 1 ? 'is-active' : ''}>{b}</span>
            </span>
          ))}
        </div>
        <h1 className="adm-top-title">{title}</h1>
      </div>
      <div className="adm-top-actions">
        <button className="adm-icon-btn"><I icon={Search}/></button>
        <button className="adm-icon-btn"><I icon={Bell}/><span className="adm-icon-dot"/></button>
        <div className="adm-divider"/>
        <button className="be-btn be-btn-secondary be-btn-sm" onClick={onLogout}><I icon={LogOut} size={14}/>Logout</button>
      </div>
    </header>
  );
}

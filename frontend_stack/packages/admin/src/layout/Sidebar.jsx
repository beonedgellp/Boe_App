import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import logo from '@beonedge/shared/assets/logo.svg';
import { NAV_DOMAINS } from '../navigation/nav.js';
import { initials, displayRole } from '../helpers/formatters.js';
import I from '../components/I.jsx';

const OPEN_GROUPS_KEY = 'boe.admin.nav.openGroups';

function readOpenGroups() {
  try {
    const raw = window.localStorage.getItem(OPEN_GROUPS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // localStorage unavailable: fall through to defaults
  }
  return {};
}

function persistOpenGroups(next) {
  try {
    window.localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next));
  } catch {
    // best effort only
  }
}

function SidebarGroup({ domain, counts, isOpen, onToggle }) {
  const isSingleItem = domain.items.length === 1;

  if (isSingleItem) {
    const item = domain.items[0];
    return (
      <div className="ash-nav-group">
        <SidebarItem item={item} counts={counts} />
      </div>
    );
  }

  return (
    <div className="ash-nav-group">
      <button
        type="button"
        className="ash-nav-group-toggle"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>{domain.label}</span>
        <I icon={ChevronDown} size={13} className={`ash-nav-chevron ${isOpen ? '' : 'is-collapsed'}`} />
      </button>
      {isOpen && domain.items.map((item) => (
        <SidebarItem key={item.path} item={item} counts={counts} />
      ))}
    </div>
  );
}

function SidebarItem({ item, counts }) {
  const count = item.badge ? Number(counts[item.badge]) : 0;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => `ash-nav-item ${isActive ? 'is-active' : ''}`}
    >
      {item.icon && <I icon={item.icon} size={15} />}
      <span className="ash-nav-item-label">{item.label}</span>
      {count > 0 && <span className="ash-nav-count">{count}</span>}
    </NavLink>
  );
}

export default function Sidebar({ user, counts = {} }) {
  const [openGroups, setOpenGroups] = useState(readOpenGroups);

  function toggleGroup(domainId) {
    setOpenGroups((prev) => {
      const next = { ...prev, [domainId]: prev[domainId] === false };
      persistOpenGroups(next);
      return next;
    });
  }

  const displayName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Admin';

  return (
    <aside className="ash-side">
      <div className="ash-brand">
        <img src={logo} height="22" alt="BeOnEdge" />
        <span className="ash-brand-tag">ADMIN</span>
      </div>
      <div className="ash-side-user-mobile" aria-label="Signed in as">
        <div className="ash-avatar">{user?.avatarInitials || initials(displayName)}</div>
        <span className="ash-side-user-mobile-name">{displayName}</span>
      </div>
      <nav className="ash-nav" aria-label="Admin sections">
        {NAV_DOMAINS.map((domain) => (
          <SidebarGroup
            key={domain.id}
            domain={domain}
            counts={counts}
            isOpen={openGroups[domain.id] !== false}
            onToggle={() => toggleGroup(domain.id)}
          />
        ))}
      </nav>
      <div className="ash-side-foot">
        <div className="ash-side-user">
          <div className="ash-avatar">{user?.avatarInitials || initials(displayName)}</div>
          <div className="ash-side-user-meta">
            <div className="ash-side-user-name">{displayName}</div>
            <div className="ash-side-user-role">{displayRole(user)}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

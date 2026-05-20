import {
  UserCheck, ShieldCheck, LineChart, Layers, TrendingUp, PieChart,
  CreditCard, Repeat, BookOpen, Inbox, LifeBuoy, History, Settings, LayoutGrid, Eye,
} from 'lucide-react';
import logo from '../../assets/logo.svg';
import { initials, displayRole } from '../helpers/formatters.js';
import I from './I.jsx';

export default function AdminSidebar({ active, onChange, user, counts = {} }) {
  const groups = [
    { title: 'Operations', items: [
      { id: 'approvals', label: 'User approvals', icon: UserCheck, count: counts.approvals },
      { id: 'userDetail', label: 'User detail', icon: Eye },
      { id: 'kyc',       label: 'KYC review',     icon: ShieldCheck, count: counts.kyc },
      { id: 'risk',      label: 'Risk profiles',  icon: LineChart },
    ]},
    { title: 'AUM', items: [
      { id: 'funds',     label: 'AUM',      icon: Layers },
      { id: 'holdings',  label: 'Holdings',           icon: PieChart },
    ]},
    { title: 'Money', items: [
      { id: 'payments',  label: 'Payments',  icon: CreditCard },
      { id: 'mandates',  label: 'Mandates',  icon: Repeat },
      { id: 'transactions', label: 'Transactions', icon: BookOpen },
      { id: 'ledger',    label: 'Ledger',    icon: History },
      { id: 'requests',  label: 'SIP control', icon: Inbox, count: counts.requests },
    ]},
    { title: 'System', items: [
      { id: 'appBuilder', label: 'App builder', icon: LayoutGrid },
      { id: 'support',   label: 'Support tickets', icon: LifeBuoy },
      { id: 'audit',     label: 'Audit log',        icon: History },
      { id: 'env',       label: 'Environment',      icon: Settings },
    ]},
  ];
  const displayName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Admin';
  return (
    <aside className="adm-side">
      <div className="adm-brand">
        <img src={logo} height="22" alt="BeOnEdge"/>
        <span className="adm-brand-tag">ADMIN</span>
      </div>
      <nav>
        {groups.map(g => (
          <div className="adm-side-group" key={g.title}>
            <div className="adm-side-title">{g.title}</div>
            {g.items.map(it => (
              <button
                key={it.id}
                className={`adm-side-item ${active === it.id ? 'is-active' : ''}`}
                onClick={() => onChange(it.id)}
              >
                {it.icon && <I icon={it.icon}/>}
                <span>{it.label}</span>
                {Number(it.count) > 0 && <span className="adm-side-count">{it.count}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="adm-side-foot">
        <div className="adm-env">
          <span className="be-badge be-badge-neutral"><span className="be-badge-dot"/>Environment</span>
        </div>
        <div className="adm-side-user">
          <div className="adm-avatar">{user?.avatarInitials || initials(displayName)}</div>
          <div>
            <div className="adm-side-user-name">{displayName}</div>
            <div className="adm-side-user-role">{displayRole(user)}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, PieChart, Receipt, User } from 'lucide-react';

const tabs = [
  { to: '/app/dashboard', label: 'Home', icon: Home },
  { to: '/app/explore', label: 'Explore', icon: Compass },
  { to: '/app/portfolio', label: 'Portfolio', icon: PieChart },
  { to: '/app/transactions', label: 'Transactions', icon: Receipt },
  { to: '/app/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  return (
    <nav className="apk-tabbar" aria-label="Primary">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          role="tab"
          className={({ isActive }) => 'apk-tab' + (isActive ? ' is-active' : '')}
          aria-label={label}
        >
          <Icon size={20} strokeWidth={1.5} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

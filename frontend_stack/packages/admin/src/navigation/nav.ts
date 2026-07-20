import {
  LayoutDashboard, UserCheck, Users, ShieldCheck, LineChart, CreditCard, Repeat,
  Globe, GraduationCap, Tags, HelpCircle, PenSquare,
  Layers, PieChart, History, BookOpen, Inbox,
  LayoutGrid, LifeBuoy, Settings,
} from 'lucide-react';

// Single source of truth for the admin information architecture.
// Sidebar groups, breadcrumbs, and page titles all derive from this tree.

export const NAV_DOMAINS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { path: '/admin/overview', label: 'Overview', icon: LayoutDashboard, title: 'Overview' },
    ],
  },
  {
    id: 'users',
    label: 'Users',
    items: [
      { path: '/admin/users/approvals', label: 'Approvals', icon: UserCheck, badge: 'approvals', title: 'User approvals' },
      { path: '/admin/users/subscriptions', label: 'Subscriptions', icon: Repeat, title: 'Subscriptions' },
      { path: '/admin/users/payments', label: 'Payments', icon: CreditCard, title: 'Payments' },
      { path: '/admin/users/directory', label: 'Directory', icon: Users, title: 'User directory' },
      { path: '/admin/users/kyc', label: 'KYC review', icon: ShieldCheck, badge: 'kyc', title: 'KYC review' },
      { path: '/admin/users/risk-profiles', label: 'Risk profiles', icon: LineChart, title: 'Risk profiles' },
    ],
  },
  {
    id: 'site',
    label: 'Site Control',
    items: [
      { path: '/admin/site/content', label: 'Page content', icon: PenSquare, title: 'Landing page content' },
      { path: '/admin/site/courses', label: 'Courses', icon: GraduationCap, title: 'Courses' },
      { path: '/admin/site/plans', label: 'Plans', icon: Tags, title: 'Plans' },
      { path: '/admin/site/faqs', label: 'FAQs', icon: HelpCircle, title: 'FAQs' },
    ],
  },
  {
    id: 'app',
    label: 'App Management',
    items: [
      { path: '/admin/app/builder', label: 'App builder', icon: LayoutGrid, title: 'App builder' },
    ],
  },
  {
    id: 'ops',
    label: 'Operations',
    items: [
      { path: '/admin/ops/funds', label: 'AUM pools', icon: Layers, title: 'AUM pools' },
      { path: '/admin/ops/holdings', label: 'Holdings', icon: PieChart, title: 'Holdings' },
      { path: '/admin/ops/transactions', label: 'Transactions', icon: BookOpen, title: 'Transactions' },
      { path: '/admin/ops/ledger', label: 'Ledger', icon: History, title: 'Reconciliation ledger' },
      { path: '/admin/ops/sip-control', label: 'SIP control', icon: Inbox, badge: 'requests', title: 'SIP control' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { path: '/admin/system/support', label: 'Support tickets', icon: LifeBuoy, title: 'Support tickets' },
      { path: '/admin/system/audit-log', label: 'Audit log', icon: History, title: 'Audit log' },
      { path: '/admin/system/environment', label: 'Environment', icon: Settings, title: 'Environment' },
    ],
  },
];

const DEFAULT_META = {
  title: 'Overview',
  crumbs: ['BeOnEdge', 'Overview'],
  crumbPaths: ['/admin/overview', '/admin/overview'],
};

export function findNavMeta(pathname) {
  for (const domain of NAV_DOMAINS) {
    for (const item of domain.items) {
      if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
        const crumbs = domain.id === 'overview'
          ? ['BeOnEdge', item.label]
          : ['BeOnEdge', domain.label, item.label];
        const domainPath = domain.items[0]?.path || '/admin/overview';
        const crumbPaths = domain.id === 'overview'
          ? ['/admin/overview', item.path]
          : ['/admin/overview', domainPath, item.path];
        return { title: item.title, crumbs, crumbPaths, domainId: domain.id, item };
      }
    }
  }
  return DEFAULT_META;
}

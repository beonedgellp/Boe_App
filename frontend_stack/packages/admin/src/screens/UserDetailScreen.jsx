import { useEffect, useState } from 'react';
import {
  User, PieChart, Briefcase, CreditCard, Repeat, RotateCcw, Inbox,
  LifeBuoy, Bell, History, LayoutGrid, TrendingUp, X, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { apiRequest } from '@beonedge/client/services/_util.js';
import '../styles/desktop/admin.css';
import '../styles/mobile/admin.css';
import './admin-screens-shared.css';
import I from '../components/I.jsx';
import EmptyState from '@beonedge/shared/components/EmptyState.jsx';
import { initials } from '../helpers/formatters.js';

function UserDetailScreen({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiRequest(`/v1/admin/users/${encodeURIComponent(userId)}/detail`, { scope: 'admin' })
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load user details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  const user = data?.user || {};
  const blockingReasons = data?.blockingReasons || [];
  const investmentPlans = data?.investmentPlans || [];
  const payments = data?.payments || [];
  const mandates = data?.mandates || [];
  const redemptionRequests = data?.redemptionRequests || [];
  const sipControlRequests = data?.sipControlRequests || [];
  const supportTickets = data?.supportTickets || [];
  const notifications = (data?.notifications || []).slice(0, 20);
  const auditLogsList = (data?.auditLogs || []).slice(0, 20);
  const portfolio = data?.portfolioSummary || null;

  const hasBlocking = blockingReasons.length > 0;

  const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'investments', label: 'Investments', icon: TrendingUp },
    { id: 'payments', label: 'Payments & Mandates', icon: CreditCard },
    { id: 'support', label: 'Support & Activity', icon: LifeBuoy },
  ];

  function detailStatusBadge(status) {
    const map = {
      pending: 'Pending',
      approved: 'Approved',
      active: 'Active',
      success: 'Success',
      completed: 'Completed',
      rejected: 'Rejected',
      failed: 'Failed',
      revoked: 'Revoked',
      paused: 'Paused',
      pending_user_auth: 'Pending Auth',
      open: 'Open',
      closed: 'Closed',
      reconciled: 'Reconciled',
    };
    const normalized = String(status).toLowerCase();
    const label = map[normalized] || status || '—';
    return <span className={`adm-status-badge adm-status-badge--${normalized}`}>{label}</span>;
  }

  function renderInfoCard(title, icon, fields) {
    return (
      <div className="adm-card">
        <div className="adm-card-head">
          <h2 className="adm-card-title"><I icon={icon} size={16} /> {title}</h2>
        </div>
        <div className="adm-info-grid">
          {fields.map(({ label, value }) => (
            <div key={label} className="adm-field-readonly">
              <span className="adm-field-readonly__label">{label}</span>
              <strong className="adm-field-readonly__value">{value}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderTable(title, icon, columns, rows, renderRow, emptyMsg) {
    return (
      <div className="adm-card adm-table">
        <div className="adm-card-head">
          <h2 className="adm-card-title"><I icon={icon} size={16} /> {title}</h2>
        </div>
        {rows.length === 0 ? (
          <EmptyState description={emptyMsg} />
        ) : (
          <div className="adm-table-scroll">
            <table>
              <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{rows.map(renderRow)}</tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderList(title, icon, items, renderItem, emptyMsg) {
    return (
      <div className="adm-card">
        <div className="adm-card-head">
          <h2 className="adm-card-title"><I icon={icon} size={16} /> {title}</h2>
        </div>
        {items.length === 0 ? (
          <EmptyState description={emptyMsg} />
        ) : (
          <div className="be-pad-5 be-stack-2">
            {items.map(renderItem)}
          </div>
        )}
      </div>
    );
  }

  const content = (
    <>
      {onClose && (
        <div className="adm-review-head">
          <h2 id="user-detail-title" className="adm-review-panel-title">User details</h2>
          <button className="adm-icon-btn" onClick={onClose} aria-label="Close"><I icon={X}/></button>
        </div>
      )}

      {loading && (
        <EmptyState description="Loading user details..." />
      )}
      {error && (
        <div className="adm-validation-banner adm-validation-banner--error">
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div
            role="tablist"
            aria-label="User detail sections"
            className="adm-sticky-tabs"
          >
            <div className="adm-chip-row">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`user-detail-tab-${tab.id}`}
                    aria-controls={`user-detail-tabpanel-${tab.id}`}
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    className={`adm-chip ${isActive ? 'is-active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveTab(tab.id);
                      }
                    }}
                  >
                    <I icon={tab.icon} size={14} /> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {TABS.map((tab) => (
            <div
              key={tab.id}
              role="tabpanel"
              id={`user-detail-tabpanel-${tab.id}`}
              aria-labelledby={`user-detail-tab-${tab.id}`}
              hidden={activeTab !== tab.id}
            >
              {tab.id === 'overview' && (
                <div className="be-stack-4">
                  <div className="adm-review-head">
                    <div className="adm-user">
                      <div className="adm-avatar adm-avatar-lg">{initials(user.name, 'CL')}</div>
                      <div>
                        <span className="be-eyebrow">User Detail</span>
                        <h2>{user.name || 'Client'}</h2>
                        <div className="adm-review-email">{user.email}</div>
                      </div>
                    </div>
                  </div>

                  {hasBlocking ? (
                    <div className="adm-validation-banner adm-validation-banner--error">
                      <I icon={AlertTriangle} size={14} />
                      <span><strong>Blocked:</strong> {blockingReasons.join('; ')}</span>
                    </div>
                  ) : (
                    <div className="adm-validation-banner adm-validation-banner--success">
                      <I icon={CheckCircle2} size={14} />
                      <span>No blocking reasons</span>
                    </div>
                  )}

                  {renderInfoCard('Basic Info', User, [
                    { label: 'Name', value: user.name || '—' },
                    { label: 'Email', value: user.email || '—' },
                    { label: 'Status', value: user.status || '—' },
                    { label: 'KYC Status', value: user.kycStatus || '—' },
                    { label: 'Risk Profile', value: user.riskProfileStatus || '—' },
                  ])}

                  {portfolio && renderInfoCard('Portfolio Summary', PieChart, [
                    { label: 'Total Invested', value: <span className="be-money">₹{(portfolio.totalInvested || 0).toLocaleString()}</span> },
                    { label: 'Current Value', value: <span className="be-money">₹{(portfolio.currentValue || 0).toLocaleString()}</span> },
                    { label: 'Returns', value: portfolio.returns != null ? `${portfolio.returns}%` : '—' },
                    { label: 'Funds', value: portfolio.fundCount ?? '—' },
                  ])}
                </div>
              )}

              {tab.id === 'investments' && (
                <div className="be-stack-4">
                  {renderTable('Investment Plans', Briefcase, ['Fund', 'Amount', 'Type', 'Status', 'Started'], investmentPlans, (plan, i) => (
                    <tr key={i}>
                      <td>{plan.fundName || plan.fundId || '—'}</td>
                      <td className="be-money">₹{(plan.amount || 0).toLocaleString()}</td>
                      <td>{plan.type || '—'}</td>
                      <td>{detailStatusBadge(plan.status)}</td>
                      <td className="adm-cell-meta">{plan.startedAt || '—'}</td>
                    </tr>
                  ), 'No investment plans.')}
                </div>
              )}

              {tab.id === 'payments' && (
                <div className="be-stack-4">
                  {renderTable('Payments', CreditCard, ['Reference', 'Amount', 'Mode', 'Provider', 'Status', 'Time'], payments, (p, i) => (
                    <tr key={i}>
                      <td><code className="adm-code">{p.id?.slice(0, 12) || '—'}</code></td>
                      <td className="be-money">₹{(p.amount || 0).toLocaleString()}</td>
                      <td>{p.mode || '—'}</td>
                      <td>{p.provider || '—'}</td>
                      <td>{detailStatusBadge(p.status)}</td>
                      <td className="adm-cell-meta">{p.time || p.createdAt || '—'}</td>
                    </tr>
                  ), 'No payments.')}

                  {renderTable('Mandates', Repeat, ['ID', 'Amount', 'Debit Day', 'Status', 'Last Debit', 'Next'], mandates, (m, i) => (
                    <tr key={i}>
                      <td><code className="adm-code">{m.id?.slice(0, 12) || '—'}</code></td>
                      <td className="be-money">₹{(m.amount || 0).toLocaleString()}</td>
                      <td className="be-num">{m.day || '—'}</td>
                      <td>{detailStatusBadge(m.status)}</td>
                      <td className="adm-cell-meta">{m.last || '—'}</td>
                      <td className="adm-cell-meta">{m.next || '—'}</td>
                    </tr>
                  ), 'No mandates.')}

                  {renderTable('Redemption Requests', RotateCcw, ['Fund', 'Amount', 'Type', 'Status', 'Requested'], redemptionRequests, (r, i) => (
                    <tr key={i}>
                      <td>{r.fundName || r.fundId?.slice(0, 8) || '—'}</td>
                      <td className="be-money">₹{(r.amount || 0).toLocaleString()}</td>
                      <td className="adm-capitalize">{r.type || '—'}</td>
                      <td>{detailStatusBadge(r.status)}</td>
                      <td className="adm-cell-meta">{r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ), 'No redemption requests.')}

                  {renderTable('SIP Control Requests', Inbox, ['Type', 'Fund', 'Amount', 'Status', 'Requested'], sipControlRequests, (r, i) => (
                    <tr key={i}>
                      <td>{r.type || '—'}</td>
                      <td>{r.fundName || r.fundId?.slice(0, 8) || '—'}</td>
                      <td className="be-money">₹{(r.amount || 0).toLocaleString()}</td>
                      <td>{detailStatusBadge(r.status)}</td>
                      <td className="adm-cell-meta">{r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ), 'No SIP control requests.')}
                </div>
              )}

              {tab.id === 'support' && (
                <div className="be-stack-4">
                  {renderTable('Support Tickets', LifeBuoy, ['ID', 'Subject', 'Status', 'Priority', 'Created'], supportTickets, (t, i) => (
                    <tr key={i}>
                      <td><code className="adm-code">{t.id?.slice(0, 12) || '—'}</code></td>
                      <td>{t.subject || '—'}</td>
                      <td>{detailStatusBadge(t.status)}</td>
                      <td>{t.priority || '—'}</td>
                      <td className="adm-cell-meta">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ), 'No support tickets.')}

                  {renderList('Notifications (Last 20)', Bell, notifications, (n, i) => (
                    <div key={i} className="adm-list-item">
                      <div className="adm-list-item__title">{n.title || 'Notification'}</div>
                      <div className="adm-list-item__body">{n.body || n.message || '—'}</div>
                      <div className="adm-list-item__meta adm-cell-meta">{n.createdAt ? new Date(n.createdAt).toLocaleString() : '—'}</div>
                    </div>
                  ), 'No notifications.')}

                  {renderList('Audit Logs (Last 20)', History, auditLogsList, (log, i) => (
                    <div key={i} className="adm-list-item">
                      <div className="adm-list-item__header">
                        <span className="adm-code adm-text-xs">{log.action || '—'}</span>
                        <span className="adm-cell-meta">{log.timestamp || log.createdAt || '—'}</span>
                      </div>
                      <div className="adm-list-item__body">{log.changesSummary || log.details || '—'}</div>
                    </div>
                  ), 'No audit logs.')}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </>
  );

  if (onClose) {
    return (
      <div className="adm-review-overlay" role="presentation" onMouseDown={onClose}>
        <section
          className="adm-review-panel adm-review-panel--user-detail"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-detail-title"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {content}
        </section>
      </div>
    );
  }

  return <div className="adm-screen adm-screen--narrow">{content}</div>;
}

export default UserDetailScreen;

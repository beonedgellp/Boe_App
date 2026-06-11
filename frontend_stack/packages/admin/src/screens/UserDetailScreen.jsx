import { useEffect, useState } from 'react';
import {
  User, PieChart, Briefcase, CreditCard, Repeat, RotateCcw, Inbox,
  LifeBuoy, Bell, History, LayoutGrid, TrendingUp, X, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { apiRequest } from '@beonedge/client/services/_util.js';
import '../styles/desktop/admin.css';
import '../styles/mobile/admin.css';
import I from '../components/I.jsx';
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
      pending: { bg: 'var(--be-amber-soft)', color: 'var(--be-amber)', label: 'Pending' },
      approved: { bg: 'var(--be-green-soft)', color: 'var(--be-green)', label: 'Approved' },
      active: { bg: 'var(--be-green-soft)', color: 'var(--be-green)', label: 'Active' },
      success: { bg: 'var(--be-green-soft)', color: 'var(--be-green)', label: 'Success' },
      completed: { bg: 'var(--be-green-soft)', color: 'var(--be-green)', label: 'Completed' },
      rejected: { bg: 'var(--be-red-soft)', color: 'var(--be-red)', label: 'Rejected' },
      failed: { bg: 'var(--be-red-soft)', color: 'var(--be-red)', label: 'Failed' },
      revoked: { bg: 'var(--be-red-soft)', color: 'var(--be-red)', label: 'Revoked' },
      paused: { bg: 'var(--be-amber-soft)', color: 'var(--be-amber)', label: 'Paused' },
      pending_user_auth: { bg: 'var(--be-amber-soft)', color: 'var(--be-amber)', label: 'Pending Auth' },
      open: { bg: 'var(--be-green-soft)', color: 'var(--be-green)', label: 'Open' },
      closed: { bg: 'var(--be-slate-soft)', color: 'var(--be-slate)', label: 'Closed' },
      reconciled: { bg: 'var(--be-slate-soft)', color: 'var(--be-slate)', label: 'Reconciled' },
    };
    const s = map[String(status).toLowerCase()] || { bg: 'var(--be-slate-soft)', color: 'var(--be-slate)', label: status || '—' };
    return <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color }}>{s.label}</span>;
  }

  function renderInfoCard(title, icon, fields) {
    return (
      <div className="ash-card">
        <div className="ash-card-head">
          <h3 className="ash-card-title"><I icon={icon} size={16} /> {title}</h3>
        </div>
        <div
          style={{
            padding: 'var(--be-card-pad)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--be-space-4)',
          }}
        >
          {fields.map(({ label, value }) => (
            <div key={label} className="ash-field">
              <span className="ash-label">{label}</span>
              <strong style={{ fontSize: 'var(--be-text-sm)', color: 'var(--be-fg)', fontWeight: 600, lineHeight: 1.4 }}>{value}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderTable(title, icon, columns, rows, renderRow, emptyMsg) {
    return (
      <div className="ash-card">
        <div className="ash-card-head">
          <h3 className="ash-card-title"><I icon={icon} size={16} /> {title}</h3>
        </div>
        {rows.length === 0 ? (
          <div className="ash-empty">
            <p className="ash-empty-desc">{emptyMsg}</p>
          </div>
        ) : (
          <div className="ash-table-wrap">
            <table className="ash-table">
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
      <div className="ash-card">
        <div className="ash-card-head">
          <h3 className="ash-card-title"><I icon={icon} size={16} /> {title}</h3>
        </div>
        {items.length === 0 ? (
          <div className="ash-empty">
            <p className="ash-empty-desc">{emptyMsg}</p>
          </div>
        ) : (
          <div style={{ padding: 'var(--be-card-pad)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(renderItem)}
          </div>
        )}
      </div>
    );
  }

  const panelStyle = { display: 'flex', flexDirection: 'column', gap: 'var(--be-space-4)' };

  const content = (
    <>
      {onClose && (
        <div className="adm-review-head">
          <div />
          <button className="adm-icon-btn" onClick={onClose} aria-label="Close"><I icon={X}/></button>
        </div>
      )}

      {loading && (
        <div className="ash-empty">
          <p className="ash-empty-desc">Loading user details...</p>
        </div>
      )}
      {error && (
        <div className="ash-error-banner">
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div
            role="tablist"
            aria-label="User detail sections"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'var(--be-bg)',
              padding: '12px 0',
              borderBottom: '1px solid var(--be-border)',
            }}
          >
            <div className="ash-chip-row">
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
                    className={`ash-chip ${isActive ? 'is-active' : ''}`}
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
                <div style={panelStyle}>
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
                    <div className="adm-validation-banner" style={{ background: 'var(--be-green-soft)', color: 'var(--be-green)', borderColor: 'var(--be-green)' }}>
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
                <div style={panelStyle}>
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
                <div style={panelStyle}>
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
                      <td style={{ textTransform: 'capitalize' }}>{r.type || '—'}</td>
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
                <div style={panelStyle}>
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
                    <div key={i} style={{ padding: '10px 12px', background: 'var(--be-bone)', borderRadius: 'var(--be-radius-sm)', border: '1px solid var(--be-border)' }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{n.title || 'Notification'}</div>
                      <div style={{ fontSize: 12, color: 'var(--be-slate)', marginTop: 2 }}>{n.body || n.message || '—'}</div>
                      <div className="adm-cell-meta" style={{ marginTop: 4 }}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : '—'}</div>
                    </div>
                  ), 'No notifications.')}

                  {renderList('Audit Logs (Last 20)', History, auditLogsList, (log, i) => (
                    <div key={i} style={{ padding: '10px 12px', background: 'var(--be-bone)', borderRadius: 'var(--be-radius-sm)', border: '1px solid var(--be-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="adm-code" style={{ fontSize: 12 }}>{log.action || '—'}</span>
                        <span className="adm-cell-meta">{log.timestamp || log.createdAt || '—'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--be-slate)', marginTop: 2 }}>{log.changesSummary || log.details || '—'}</div>
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
          className="adm-review-panel"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.stopPropagation()}
          style={{ maxWidth: 900, width: '90vw', maxHeight: '90vh', overflow: 'auto' }}
        >
          {content}
        </section>
      </div>
    );
  }

  return <div className="adm-screen" style={{ maxWidth: 960 }}>{content}</div>;
}

export default UserDetailScreen;

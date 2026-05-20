import { useState, useMemo } from 'react';
import {
  Search, LifeBuoy, Send, MessageCircle, Clock, CheckCircle2, XCircle, Filter,
} from 'lucide-react';
import '../styles/desktop/admin.css';
import '../styles/mobile/admin.css';
import I from '../components/I.jsx';
import StatTile from '../components/StatTile.jsx';
import EmptyTableRow from '../components/EmptyTableRow.jsx';
import { fmtInt } from '../helpers/formatters.js';
import { apiRequest } from '@beonedge/client/services/_util.js';

function statusBadge(s) {
  const map = {
    open: <span className="be-badge be-badge-active"><span className="be-badge-dot" />Open</span>,
    in_progress: <span className="be-badge be-badge-paused"><span className="be-badge-dot" />In Progress</span>,
    closed: <span className="be-badge be-badge-neutral"><span className="be-badge-dot" />Closed</span>,
  };
  return map[s] || <span className="be-badge be-badge-neutral">{s}</span>;
}

function SupportTicketsScreen({ rows = [], loading = false, onUserDetail }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState('');

  const statuses = useMemo(() => {
    const set = new Set(rows.map((r) => r.status).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch = !q ||
        String(r.subject || '').toLowerCase().includes(q) ||
        String(r.category || '').toLowerCase().includes(q) ||
        String(r.userId || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    open: rows.filter((r) => r.status === 'open').length,
    inProgress: rows.filter((r) => r.status === 'in_progress').length,
    closed: rows.filter((r) => r.status === 'closed').length,
  }), [rows]);

  async function handleReply(ticketId) {
    const text = replyText.trim();
    if (!text) return;
    setReplyBusy(true);
    setReplyError('');
    try {
      await apiRequest(`/v1/admin/support/tickets/${encodeURIComponent(ticketId)}/reply`, {
        method: 'POST',
        body: { message: text },
        scope: 'admin',
      });
      setReplyText('');
      setSelectedTicket(null);
      window.location.reload();
    } catch (err) {
      setReplyError(err?.message || 'Reply failed.');
    } finally {
      setReplyBusy(false);
    }
  }

  return (
    <div className="adm-screen">
      <div className="adm-stats">
        <StatTile label="Open" value={fmtInt(stats.open)} />
        <StatTile label="In Progress" value={fmtInt(stats.inProgress)} />
        <StatTile label="Closed" value={fmtInt(stats.closed)} />
        <StatTile label="Total" value={fmtInt(rows.length)} />
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">Customer Support</span>
            <h3 className="adm-card-title">Support tickets</h3>
          </div>
          <div className="adm-card-actions" style={{ gap: 8, display: 'flex', alignItems: 'center' }}>
            <div className="adm-search">
              <I icon={Search} size={14} />
              <input
                type="text"
                placeholder="Search subject, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="be-select be-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {statuses.map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
            </select>
          </div>
        </div>

        <table>
          <thead><tr>
            <th>ID</th><th>Subject</th><th>Category</th><th>Status</th><th>Created</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && (
              <EmptyTableRow colSpan={6}>No support tickets match the current filters.</EmptyTableRow>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td><code className="adm-code">{String(r.id).slice(0, 8)}...</code></td>
                <td>{r.subject || 'No subject'}</td>
                <td>{r.category || '—'}</td>
                <td>{statusBadge(r.status)}</td>
                <td className="be-num adm-cell-meta">{String(r.createdAt || '').slice(0, 10)}</td>
                <td className="adm-cell-actions">
                  <button className="be-btn be-btn-ghost be-btn-sm" onClick={() => onUserDetail?.(r)}>User</button>
                  <button className="be-btn be-btn-ghost be-btn-sm" onClick={() => setSelectedTicket(selectedTicket?.id === r.id ? null : r)}>
                    <I icon={MessageCircle} size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {selectedTicket && filtered.find((r) => r.id === selectedTicket.id) && (
              <tr className="adm-detail-row">
                <td colSpan={6}>
                  <div style={{ padding: 16, background: 'var(--be-surface)', borderRadius: 8 }}>
                    <h4 style={{ margin: '0 0 8px' }}>Reply to ticket</h4>
                    <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--be-slate)' }}>
                      Ticket: {selectedTicket.subject} · {selectedTicket.category}
                    </p>
                    <textarea
                      className="be-input"
                      rows={3}
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={replyBusy}
                      style={{ width: '100%', marginBottom: 8 }}
                    />
                    {replyError && <div className="be-error" style={{ marginBottom: 8 }}>{replyError}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="be-btn be-btn-primary be-btn-sm"
                        disabled={replyBusy || !replyText.trim()}
                        onClick={() => handleReply(selectedTicket.id)}
                      >
                        <I icon={Send} size={14} /> {replyBusy ? 'Sending...' : 'Send reply'}
                      </button>
                      <button className="be-btn be-btn-secondary be-btn-sm" onClick={() => setSelectedTicket(null)}>Cancel</button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SupportTicketsScreen;

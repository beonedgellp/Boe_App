import { useEffect, useState } from 'react';
import {
  Search, Filter, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { apiRequest } from '@beonedge/client/services/_util.js';
import I from '../components/I.jsx';
import StatTile from '../components/StatTile.jsx';
import EmptyTableRow from '../components/EmptyTableRow.jsx';
import SkeletonTile from '../components/SkeletonTile.jsx';
import SkeletonTableRow from '../components/SkeletonTableRow.jsx';
import { fmtInt } from '../helpers/formatters.js';

function SipControlStatusBadge({ status }) {
  const map = {
    pending: { bg: 'var(--be-amber-soft)', color: 'var(--be-amber)', label: 'Pending' },
    approved: { bg: 'var(--be-green-soft)', color: 'var(--be-green)', label: 'Approved' },
    rejected: { bg: 'var(--be-red-soft)', color: 'var(--be-red)', label: 'Rejected' },
  };
  const s = map[String(status).toLowerCase()] || { bg: 'var(--be-slate-soft)', color: 'var(--be-slate)', label: status || '—' };
  return (
    <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function RequestTypeBadge({ type }) {
  const labelMap = {
    pause: 'Pause',
    resume: 'Resume',
    cancel: 'Cancel',
    skip: 'Skip',
    step_up: 'Step Up',
    change_amount: 'Amount Change',
    amount_change: 'Amount Change',
  };
  return <span className="adm-cell-meta">{labelMap[String(type).toLowerCase()] || type || '—'}</span>;
}

export default function SipControlScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionBusyId, setActionBusyId] = useState(null);

  async function fetchRows() {
    setLoading(true);
    setError('');
    try {
      const payload = await apiRequest('/v1/admin/sip-control-requests', { scope: 'admin' });
      const data = payload?.data ?? payload ?? [];
      const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
      setRows(items);
    } catch (err) {
      setError(err?.message || 'Failed to load SIP control requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
  }, []);

  async function handleDecision(id, status) {
    setActionBusyId(id);
    try {
      await apiRequest(`/v1/admin/sip-control-requests/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { status },
        scope: 'admin',
      });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status, reviewedAt: new Date().toISOString() } : r)));
    } catch (err) {
      setError(err?.message || `Failed to ${status} request.`);
    } finally {
      setActionBusyId(null);
    }
  }

  const filteredRows = rows.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q
      || (r.userName || '').toLowerCase().includes(q)
      || (r.userEmail || '').toLowerCase().includes(q)
      || (r.fundName || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || String(r.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const approvedCount = rows.filter((r) => r.status === 'approved').length;
  const rejectedCount = rows.filter((r) => r.status === 'rejected').length;

  return (
    <div className="adm-screen">
      <div className="adm-stats">
        {loading ? (
          <>
            <SkeletonTile />
            <SkeletonTile />
            <SkeletonTile />
          </>
        ) : (
          <>
            <StatTile label="Pending requests" value={fmtInt(pendingCount)} icon={Clock} tone="amber" />
            <StatTile label="Approved" value={fmtInt(approvedCount)} icon={CheckCircle2} tone="green" />
            <StatTile label="Rejected" value={fmtInt(rejectedCount)} icon={XCircle} tone="red" />
          </>
        )}
      </div>

      <div className="adm-card adm-table">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">SIP Control Queue</span>
            <h3 className="adm-card-title">SIP Control Requests</h3>
          </div>
        </div>

        {error && (
          <div className="adm-validation-banner adm-validation-banner--error" style={{ margin: '12px 16px 0' }}>
            {error}
          </div>
        )}

        <div className="adm-toolbar">
          <div className="adm-search">
            <I icon={Search} size={14} />
            <input
              type="text"
              placeholder="Search by user or fund..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="adm-filter">
            <I icon={Filter} size={14} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="adm-table-scroll">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Fund</th>
                <th>Request Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created At</th>
                <th className="adm-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {loading && filteredRows.length === 0 && (
                <>
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                </>
              )}
              {!loading && filteredRows.length === 0 && (
                <EmptyTableRow colSpan={7}>No SIP control requests are available.</EmptyTableRow>
              )}
              {filteredRows.map((r) => (
                <tr key={r.id}>
                  <td className="adm-col-user">
                    <div className="adm-user">
                      <div className="adm-user-info">
                        <div className="adm-user-name">{r.userName || r.userId || 'Unknown'}</div>
                        {r.userEmail && <div className="adm-cell-meta">{r.userEmail}</div>}
                      </div>
                    </div>
                  </td>
                  <td>{r.fundName || '—'}</td>
                  <td><RequestTypeBadge type={r.action || r.requestType} /></td>
                  <td>{r.amount != null ? `₹${Number(r.amount).toLocaleString('en-IN')}` : '—'}</td>
                  <td><SipControlStatusBadge status={r.status} /></td>
                  <td className="adm-cell-meta">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="adm-col-actions">
                    {r.status === 'pending' && (
                      <>
                        <button
                          className="be-btn be-btn-primary be-btn-sm"
                          onClick={() => handleDecision(r.id, 'approved')}
                          disabled={actionBusyId === r.id}
                        >
                          <I icon={CheckCircle2} size={14} /> Approve
                        </button>
                        <button
                          className="be-btn be-btn-danger be-btn-sm"
                          onClick={() => handleDecision(r.id, 'rejected')}
                          disabled={actionBusyId === r.id}
                        >
                          <I icon={XCircle} size={14} /> Reject
                        </button>
                      </>
                    )}
                    {r.status !== 'pending' && (
                      <span className="adm-cell-meta">{r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString() : '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

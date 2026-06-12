import { useEffect, useState } from 'react';
import {
  Search, Filter, ShieldCheck, XCircle, CheckCircle2, Eye, X,
} from 'lucide-react';
import { apiRequest } from '@beonedge/client/services/_util.js';
import I from '../components/I.jsx';
import StatTile from '../components/StatTile.jsx';
import EmptyTableRow from '../components/EmptyTableRow.jsx';
import SkeletonTile from '../components/SkeletonTile.jsx';
import SkeletonTableRow from '../components/SkeletonTableRow.jsx';
import { fmtInt } from '../helpers/formatters.js';
import { initials } from '../helpers/formatters.js';
import './admin-screens-shared.css';

function KycStatusBadge({ status }) {
  const map = {
    not_started: { bg: 'var(--be-slate-soft)', color: 'var(--be-text-on-slate)', label: 'Not Started' },
    pending: { bg: 'var(--be-amber-soft)', color: 'var(--be-text-on-amber)', label: 'Pending' },
    in_review: { bg: 'var(--be-amber-soft)', color: 'var(--be-text-on-amber)', label: 'In Review' },
    needs_more_information: { bg: 'var(--be-amber-soft)', color: 'var(--be-text-on-amber)', label: 'Needs Info' },
    approved: { bg: 'var(--be-green-soft)', color: 'var(--be-text-on-green)', label: 'Approved' },
    rejected: { bg: 'var(--be-red-soft)', color: 'var(--be-text-on-red)', label: 'Rejected' },
  };
  const normalized = String(status).toLowerCase();
  const s = map[normalized] || { bg: 'var(--be-slate-soft)', color: 'var(--be-text-on-slate)', label: status || '—' };
  return <span className={`adm-status-badge adm-status-badge--${normalized}`}>{s.label}</span>;
}

function KycReviewPanel({ row, onClose, onDecision, busy }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!row) return null;

  async function handleDecision(action) {
    if (action === 'reject' && !reason.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    setError('');
    try {
      await onDecision(row, action, reason.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Review action failed.');
    }
  }

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div
        className="adm-overlay-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kyc-review-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="adm-overlay-head">
          <h2 id="kyc-review-title">KYC Review</h2>
          <button className="adm-icon-btn" onClick={onClose} aria-label="Close"><span aria-hidden="true" className="adm-close-glyph">&times;</span></button>
        </div>
        <div className="adm-m-b-4">
          <div className="adm-user adm-m-b-3">
            <div className="adm-avatar adm-avatar-sm">{initials(row.name, 'CL')}</div>
            <div className="adm-user-info">
              <div className="adm-user-name">{row.name}</div>
              <div className="adm-cell-meta">{row.email}</div>
            </div>
          </div>
          <div className="adm-review-grid adm-review-grid--tight">
            <div className="adm-review-field"><span>PAN last-4</span><strong>{row.panLast4 || '—'}</strong></div>
            <div className="adm-review-field"><span>Aadhaar last-4</span><strong>{row.aadhaarLast4 || '—'}</strong></div>
            <div className="adm-review-field"><span>KYC Status</span><strong><KycStatusBadge status={row.kycReviewStatus} /></strong></div>
            <div className="adm-review-field"><span>Reviewed At</span><strong>{row.kycReviewedAt ? new Date(row.kycReviewedAt).toLocaleDateString() : '—'}</strong></div>
          </div>
        </div>
        <div className="adm-field">
          <label htmlFor="kyc-review-reason">Review note / rejection reason</label>
          <textarea
            id="kyc-review-reason"
            className="be-input"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={row.kycReviewStatus === 'rejected' ? 'Required for rejection' : 'Optional approval note'}
          />
        </div>
        {error && <div className="adm-validation-banner adm-validation-banner--error adm-m-t-2">{error}</div>}
        <div className="adm-review-actions">
          <button className="be-btn be-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="be-btn be-btn-danger" onClick={() => handleDecision('reject')} disabled={busy}>
            <I icon={XCircle} size={14} /> Reject
          </button>
          <button className="be-btn be-btn-primary" onClick={() => handleDecision('approve')} disabled={busy}>
            <I icon={CheckCircle2} size={14} /> Approve
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KycReviewScreen({ rows = [], stats = {}, loading = false, onUserDetail }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewRow, setReviewRow] = useState(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [localRows, setLocalRows] = useState(rows);

  useEffect(() => { setLocalRows(rows); }, [rows]);

  const filteredRows = localRows.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || String(r.kycReviewStatus || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  async function handleDecision(row, action, reason) {
    setReviewBusy(true);
    try {
      await apiRequest(`/v1/admin/kyc-review/${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        body: { action, reason: reason || (action === 'approve' ? 'Approved from KYC review.' : 'Rejected from KYC review.') },
        scope: 'admin',
      });
      setLocalRows((prev) => prev.map((r) => r.id === row.id ? { ...r, kycReviewStatus: action === 'approve' ? 'approved' : 'rejected', kycReviewedAt: new Date().toISOString() } : r));
    } catch (err) {
      throw err;
    } finally {
      setReviewBusy(false);
    }
  }

  const pendingCount = localRows.filter((r) => !['approved', 'rejected'].includes(r.kycReviewStatus)).length;
  const approvedCount = localRows.filter((r) => r.kycReviewStatus === 'approved').length;
  const rejectedCount = localRows.filter((r) => r.kycReviewStatus === 'rejected').length;

  return (
    <div className="adm-screen">
      <div className="adm-stats">
        {loading ? (
          <>
            <SkeletonTile /><SkeletonTile /><SkeletonTile />
          </>
        ) : (
          <>
            <StatTile label="Pending KYC" value={fmtInt(pendingCount)} icon={ShieldCheck} tone="amber" />
            <StatTile label="Approved KYC" value={fmtInt(approvedCount)} icon={CheckCircle2} tone="green" />
            <StatTile label="Rejected KYC" value={fmtInt(rejectedCount)} icon={XCircle} tone="red" />
          </>
        )}
      </div>

      <div className="adm-card adm-table">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">KYC Queue</span>
            <h2 className="adm-card-title">KYC Review</h2>
          </div>
        </div>

        <div className="adm-toolbar">
          <div className="adm-search">
            <I icon={Search} size={14} />
            <input type="text" aria-label="Search KYC records by name or email" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="adm-filter">
            <I icon={Filter} size={14} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by KYC status">
              <option value="all">All statuses</option>
              <option value="not_started">Not Started</option>
              <option value="pending">Pending</option>
              <option value="in_review">In Review</option>
              <option value="needs_more_information">Needs Info</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="adm-table-scroll">
          <table>
            <thead>
              <tr>
                <th className="adm-col-user">User</th>
                <th>PAN last-4</th>
                <th>Aadhaar last-4</th>
                <th>Status</th>
                <th>Reviewed</th>
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
                <EmptyTableRow colSpan={6}>No KYC review records are available.</EmptyTableRow>
              )}
              {filteredRows.map((r) => (
                <tr key={r.id || r.email}>
                  <td className="adm-col-user">
                    <div className="adm-user">
                      <div className="adm-avatar adm-avatar-sm">{initials(r.name, 'CL')}</div>
                      <div className="adm-user-info">
                        <div className="adm-user-name">{r.name}</div>
                        <div className="adm-cell-meta">{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{r.panLast4 || '—'}</td>
                  <td>{r.aadhaarLast4 || '—'}</td>
                  <td><KycStatusBadge status={r.kycReviewStatus} /></td>
                  <td className="adm-cell-meta">{r.kycReviewedAt ? new Date(r.kycReviewedAt).toLocaleDateString() : '—'}</td>
                  <td className="adm-col-actions">
                    <button className="be-btn be-btn-secondary be-btn-sm" onClick={() => setReviewRow(r)}>Review</button>
                    <button className="be-btn be-btn-ghost be-btn-sm" onClick={() => onUserDetail?.(r)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {reviewRow && (
        <KycReviewPanel
          row={reviewRow}
          onClose={() => setReviewRow(null)}
          onDecision={handleDecision}
          busy={reviewBusy}
        />
      )}
    </div>
  );
}

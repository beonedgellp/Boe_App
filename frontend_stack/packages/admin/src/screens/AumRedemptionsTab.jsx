import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  UserCheck, ShieldCheck, LineChart, Layers, TrendingUp, PieChart,
  CreditCard, Repeat, BookOpen, Inbox, LifeBuoy, History, Settings,
  Search, Bell, Plus, MoreHorizontal, LayoutGrid, Trash2, Save, RotateCcw, LogOut,
  X, CheckCircle2, XCircle, Clock, Timer, TrendingDown, Filter, User, Mail, Phone, Shield, FileText,
  BarChart3, Activity, Eye, EyeOff, AlertTriangle, Pencil, Gauge, Percent, Briefcase, Archive, ChevronRight, ClipboardList, ArrowLeft,
  Copy,
} from 'lucide-react';
import {
  RiskBadge, LifecycleBadge, StatusBadge,
} from '@beonedge/shared/components/Badges.jsx';
import { SectorMiniBar } from '@beonedge/shared/components/SectorMiniBar.jsx';

import logo from '@beonedge/shared/assets/logo.svg';
import {
  COMPONENT_LIBRARY,
  loadRemoteAppConfig,
  loadAppConfig,
  publishAppConfig,
  resetAppConfig,
} from '@beonedge/shared/appConfig.js';
import { useAdminSession } from '@beonedge/client/store/AdminSessionContext.jsx';
import { apiRequest, listFromPayload, useHttpApi } from '@beonedge/client/services/_util.js';
import { listPendingApprovals } from '@beonedge/client/services/authApi.js';
import '../styles/desktop/admin.css';
import '../styles/mobile/admin.css';
import I from '../components/I.jsx';
import EmptyTableRow from '../components/EmptyTableRow.jsx';

function AumRedemptionsTab({ onUserDetail }) {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actionRequest, setActionRequest] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadRequests() {
    setLoading(true);
    try {
      const r = await apiRequest(`/v1/admin/redemption-requests?status=${filter}`, { scope: 'admin' });
      setRequests(r.items || []);
    } catch (err) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRequests(); }, [filter]);

  async function handleProcess(requestId, action) {
    if (!reason.trim() && action === 'rejected') {
      alert('Please provide a reason for rejection.');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest(`/v1/admin/redemption-requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        body: { action, reason },
        scope: 'admin',
      });
      setActionRequest(null);
      setReason('');
      loadRequests();
    } catch (err) {
      alert(err.message || 'Failed to process request.');
    } finally {
      setSubmitting(false);
    }
  }

  const statusBadge = (status) => {
    const map = {
      pending: { bg: 'var(--be-amber-soft)', color: 'var(--be-amber)', label: 'Pending' },
      approved: { bg: 'var(--be-green-soft)', color: 'var(--be-green)', label: 'Approved' },
      rejected: { bg: 'var(--be-red-soft)', color: 'var(--be-red)', label: 'Rejected' },
    };
    const s = map[status] || map.pending;
    return <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  return (
    <div className="adm-fund-pools">
      <div className="adm-card adm-table">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">Withdrawal Requests</span>
            <h2 className="adm-card-title">User redemption requests</h2>
          </div>
          <div className="adm-card-actions">
            <div className="adm-filter">
              <select value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <button className="be-btn be-btn-primary be-btn-sm" onClick={loadRequests}><I icon={RotateCcw} size={14}/> Refresh</button>
          </div>
        </div>
        <div className="adm-table-scroll">
          <table>
            <thead>
              <tr><th>User</th><th>Fund</th><th>Type</th><th>Amount</th><th>Status</th><th>Requested</th><th></th></tr>
            </thead>
            <tbody>
              {loading && <EmptyTableRow colSpan={7}>Loading...</EmptyTableRow>}
              {!loading && requests.length === 0 && <EmptyTableRow colSpan={7}>No redemption requests.</EmptyTableRow>}
              {!loading && requests.map(req => (
                <tr key={req.id}>
                  <td>{req.userId?.slice(0, 8) || '—'}</td>
                  <td>{req.fundName || req.fundId?.slice(0, 8)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{req.type}</td>
                  <td className="be-money">₹{(req.amount || 0).toLocaleString()}</td>
                  <td>{statusBadge(req.status)}</td>
                  <td className="adm-cell-meta">{req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : '—'}</td>
                  <td className="adm-cell-actions">
                    <button className="be-btn be-btn-ghost be-btn-sm" onClick={() => onUserDetail?.(req)}>View</button>
                    {req.status === 'pending' && (
                      <>
                        <button className="be-btn be-btn-primary be-btn-sm" onClick={() => { setActionRequest(req); setActionType('approved'); }}>Approve</button>
                        <button className="be-btn be-btn-danger be-btn-sm" onClick={() => { setActionRequest(req); setActionType('rejected'); }}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action modal */}
      {actionRequest && (
        <div className="adm-review-overlay" role="presentation" onMouseDown={() => !submitting && setActionRequest(null)}>
          <section className="adm-review-panel" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
            <div className="adm-review-head">
              <div>
                <span className="be-eyebrow">{actionType === 'approved' ? 'Approve' : 'Reject'} redemption</span>
                <h2>{actionRequest.fundName || 'Fund'}</h2>
              </div>
              <button className="adm-icon-btn" onClick={() => setActionRequest(null)} aria-label="Close" disabled={submitting}><I icon={X}/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              <div><span className="be-eyebrow">User</span><div style={{ fontSize: 14 }}>{actionRequest.userId}</div></div>
              <div><span className="be-eyebrow">Amount</span><div className="be-money" style={{ fontSize: 20 }}>₹{(actionRequest.amount || 0).toLocaleString()}</div></div>
              <div><span className="be-eyebrow">Type</span><div style={{ fontSize: 14, textTransform: 'capitalize' }}>{actionRequest.type}</div></div>
            </div>
            <label className="adm-field">
              <span>Reason {actionType === 'rejected' && '*'}</span>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder={actionType === 'rejected' ? 'Required rejection reason' : 'Optional note'} required={actionType === 'rejected'} />
            </label>
            <div className="adm-review-actions">
              <button className="be-btn be-btn-secondary" onClick={() => setActionRequest(null)} disabled={submitting}>Cancel</button>
              <button className={`be-btn ${actionType === 'approved' ? 'be-btn-primary' : 'be-btn-danger'}`} onClick={() => handleProcess(actionRequest.id, actionType)} disabled={submitting}>
                {submitting ? 'Processing...' : (actionType === 'approved' ? 'Approve Redemption' : 'Reject Redemption')}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AumRedemptionsTab;

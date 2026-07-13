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
import './admin-screens-shared.css';
import I from '../components/I.jsx';
import EmptyTableRow from '../components/EmptyTableRow.jsx';
import { fmtMoney } from '@beonedge/shared/format.js';

function AumCapitalTab({ funds }) {
  const [selectedFund, setSelectedFund] = useState('');
  const [actionMode, setActionMode] = useState(null); // 'inflow' | 'outflow' | null
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    apiRequest('/v1/admin/capital-transactions', { scope: 'admin' })
      .then(r => setTransactions(r.items || []))
      .catch(() => setTransactions([]));
  }, []);

  const fund = funds.find(f => f.id === selectedFund) || null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fund || !amount || Number(amount) <= 0) return;
    if (actionMode === 'outflow' && !reason.trim()) {
      setMessage({ type: 'error', text: 'Reason is required for withdrawals.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const endpoint = actionMode === 'inflow' ? 'inflow' : 'outflow';
      await apiRequest(`/v1/admin/funds/${encodeURIComponent(fund.id)}/${endpoint}`, {
        method: 'POST',
        body: { amount: Number(amount), reason },
        scope: 'admin',
      });
      setMessage({ type: 'success', text: `${actionMode === 'inflow' ? 'Capital added' : 'Capital withdrawn'} successfully.` });
      setAmount('');
      setReason('');
      // Refresh transactions
      const r = await apiRequest('/v1/admin/capital-transactions', { scope: 'admin' });
      setTransactions(r.items || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to process capital flow.' });
    } finally {
      setSubmitting(false);
    }
  }

  const txTypeLabel = { allocation: 'Allocate', unallocation: 'Unallocate', inflow: 'Inflow', outflow: 'Outflow' };

  return (
    <div className="adm-fund-pools">
      <div className="adm-fund-editor-layout adm-fund-editor-layout--equal">
        <div className="adm-fund-editor-main">
          <div className="adm-fund-editor-section">
            <div className="adm-fund-editor-section-title"><I icon={TrendingUp} size={16} /> Capital Flow History</div>
            <div className="adm-table-scroll">
              <table>
                <thead>
                  <tr><th>Type</th><th>Fund</th><th>Amount</th><th>Source → Target</th><th>Reason</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {transactions.length === 0 && <EmptyTableRow colSpan={6}>No capital transactions yet.</EmptyTableRow>}
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td><span className={`adm-tx-type adm-tx-type--${tx.type || 'default'}`}>{txTypeLabel[tx.type] || tx.type}</span></td>
                      <td>{funds.find(f => f.id === tx.fundId)?.name || tx.fundId.slice(0, 8)}</td>
                      <td className="be-money">₹{(tx.amount || 0).toLocaleString()}</td>
                      <td className="adm-cell-sub">{tx.source} → {tx.target}</td>
                      <td className="adm-cell-sub">{tx.reason || '—'}</td>
                      <td className="adm-cell-meta">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="adm-fund-editor-side">
          <div className="adm-fund-editor-section">
            <div className="adm-fund-editor-section-title">Capital Control</div>
            <label className="adm-field">
              <span>Fund</span>
              <select value={selectedFund} onChange={e => setSelectedFund(e.target.value)}>
                <option value="">Select fund</option>
                {funds.map(f => (
                  <option key={f.id} value={f.id}>{f.name} — ₹{(f.totalPoolSize || 0).toLocaleString()}</option>
                ))}
              </select>
            </label>

            {fund && (
              <div className="adm-metric-grid--2 adm-m-b-3">
                <div className="adm-stat adm-stat--sm">
                  <div className="be-eyebrow">Pool Size</div>
                  <div className="adm-stat-value adm-stat-value--sm be-money">{fmtMoney(fund.totalPoolSize)}</div>
                </div>
                <div className="adm-stat adm-stat--sm">
                  <div className="be-eyebrow">Cash</div>
                  <div className="adm-stat-value adm-stat-value--sm be-money be-gain">
                    {fmtMoney((fund.totalPoolSize || 0) - (fund.analytics?.totalInvested || 0))}
                  </div>
                </div>
              </div>
            )}

            <div className="adm-action-row">
              <button className={`be-btn be-btn-sm ${actionMode === 'inflow' ? 'be-btn-primary' : 'be-btn-secondary'}`} onClick={() => setActionMode('inflow')}>
                <I icon={Plus} size={14} /> Add Capital
              </button>
              <button className={`be-btn be-btn-sm ${actionMode === 'outflow' ? 'be-btn-primary' : 'be-btn-secondary'}`} onClick={() => setActionMode('outflow')}>
                <I icon={RotateCcw} size={14} /> Withdraw
              </button>
            </div>

            {actionMode && fund && (
              <form onSubmit={handleSubmit}>
                {message && (
                  <div className={`adm-validation-banner adm-validation-banner--${message.type} adm-m-b-2`}>
                    <I icon={AlertTriangle} size={14} /> {message.text}
                  </div>
                )}
                <label className="adm-field">
                  <span>Amount (INR)</span>
                  <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} required />
                </label>
                <label className="adm-field">
                  <span>Reason {actionMode === 'outflow' && '*'}</span>
                  <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder={actionMode === 'outflow' ? 'Required: e.g. operational expense' : 'Optional reason'} required={actionMode === 'outflow'} />
                </label>
                <button type="submit" className="be-btn be-btn-primary be-btn-block" disabled={submitting}>
                  {submitting ? 'Processing...' : (actionMode === 'inflow' ? 'Add Capital to Pool' : 'Withdraw from Pool')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* AUM — Redemptions Tab (Withdrawal Requests)                                */
/* -------------------------------------------------------------------------- */

export default AumCapitalTab;

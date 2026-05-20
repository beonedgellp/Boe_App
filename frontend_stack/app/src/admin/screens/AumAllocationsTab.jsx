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
} from '../../shared/components/Badges.jsx';
import { SectorMiniBar } from '../../shared/components/SectorMiniBar.jsx';

import logo from '../../assets/logo.svg';
import {
  COMPONENT_LIBRARY,
  loadRemoteAppConfig,
  loadAppConfig,
  publishAppConfig,
  resetAppConfig,
} from '../../shared/appConfig.js';
import { useAdminSession } from '../../client/store/AdminSessionContext.jsx';
import { apiRequest, listFromPayload, useHttpApi } from '../../client/services/_util.js';
import { listPendingApprovals } from '../../client/services/authApi.js';
import '../styles/admin.css';
import I from '../components/I.jsx';
import EmptyTableRow from '../components/EmptyTableRow.jsx';

function AumAllocationsTab({ funds }) {
  const [selectedFund, setSelectedFund] = useState(null);
  const [actionMode, setActionMode] = useState(null); // 'allocate' | 'unallocate' | null
  const [selectedInvestment, setSelectedInvestment] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fund = funds.find(f => f.id === selectedFund) || null;
  const analytics = fund?.analytics || {};
  const cash = fund ? (Number(fund.totalPoolSize) - (analytics.totalInvested || 0)) : 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fund || !selectedInvestment || !amount || Number(amount) <= 0) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const endpoint = actionMode === 'allocate' ? 'allocate' : 'unallocate';
      await apiRequest(`/v1/admin/funds/${encodeURIComponent(fund.id)}/${endpoint}`, {
        method: 'POST',
        body: { investmentId: selectedInvestment, amount: Number(amount), reason },
        scope: 'admin',
      });
      setMessage({ type: 'success', text: `${actionMode === 'allocate' ? 'Allocated' : 'Unallocated'} ₹${Number(amount).toLocaleString()} successfully.` });
      setAmount('');
      setReason('');
      setSelectedInvestment('');
      window.location.reload();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to process allocation.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="adm-fund-pools">
      {!selectedFund ? (
        <div className="adm-card adm-table">
          <div className="adm-card-head">
            <div>
              <span className="be-eyebrow">Allocations</span>
              <h3 className="adm-card-title">Manage fund allocations</h3>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--be-slate)', padding: '0 18px 14px' }}>
            Select a fund to allocate cash to investments or unallocate back to cash.
          </p>
          <div className="adm-table-scroll">
            <table>
              <thead>
                <tr><th>Fund</th><th>Pool Size</th><th>Allocated</th><th>Cash</th><th>Investments</th><th></th></tr>
              </thead>
              <tbody>
                {funds.length === 0 && <EmptyTableRow colSpan={6}>No funds available.</EmptyTableRow>}
                {funds.map(f => {
                  const fa = f.analytics || {};
                  const fcash = (f.totalPoolSize || 0) - (fa.totalInvested || 0);
                  return (
                    <tr key={f.id}>
                      <td><span style={{fontFamily:'var(--be-font-serif)',fontSize:15,fontWeight:600}}>{f.name}</span></td>
                      <td className="be-money">{f.totalPoolSize ?? 0}</td>
                      <td className="be-money">{fa.totalInvested ?? 0}</td>
                      <td className="be-money" style={{ color: fcash < 0 ? 'var(--be-red)' : 'var(--be-green)' }}>{fcash}</td>
                      <td className="be-num">{f.investments?.length ?? 0}</td>
                      <td className="adm-cell-actions">
                        <button className="be-btn be-btn-primary be-btn-sm" onClick={() => setSelectedFund(f.id)}>Manage</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="adm-fund-editor-layout" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="adm-fund-editor-main">
            <div className="adm-fund-editor-section">
              <div className="adm-fund-editor-section-title"><I icon={PieChart} size={16} /> {fund.name} — Allocation</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
                <div className="adm-stat" style={{ padding: 14 }}>
                  <div className="be-eyebrow">Pool Size</div>
                  <div className="adm-stat-value be-money">{fmtMoney(fund.totalPoolSize)}</div>
                </div>
                <div className="adm-stat" style={{ padding: 14 }}>
                  <div className="be-eyebrow">Allocated</div>
                  <div className="adm-stat-value be-money">{fmtMoney(analytics.totalInvested)}</div>
                </div>
                <div className="adm-stat" style={{ padding: 14, borderColor: cash < 0 ? 'var(--be-red)' : 'var(--be-border)' }}>
                  <div className="be-eyebrow">Cash Available</div>
                  <div className="adm-stat-value be-money" style={{ color: cash < 0 ? 'var(--be-red)' : 'var(--be-green)' }}>{fmtMoney(cash)}</div>
                </div>
              </div>

              <div className="be-eyebrow" style={{ marginBottom: 8 }}>Current Investments</div>
              {fund.investments?.length === 0 && <div className="adm-empty-state">No investments yet.</div>}
              {fund.investments?.map(inv => {
                const pct = fund.totalPoolSize > 0 ? ((inv.amount || 0) / fund.totalPoolSize * 100).toFixed(1) : '0.0';
                const sector = fund.sectors?.find(s => s.id === inv.sectorId);
                return (
                  <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--be-border)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{inv.companyName || 'Unnamed'}</div>
                      <div style={{ fontSize: 12, color: 'var(--be-slate)' }}>
                        {sector ? <><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: sector.color, marginRight: 4 }} />{sector.name}</> : 'No sector'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="be-money" style={{ fontWeight: 600 }}>₹{(inv.amount || 0).toLocaleString()}</div>
                      <div className="be-num" style={{ fontSize: 12, color: 'var(--be-slate)' }}>{pct}% of pool</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="adm-fund-editor-side">
            <div className="adm-fund-editor-section">
              <div className="adm-fund-editor-section-title">Allocation Actions</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button className={`be-btn be-btn-sm ${actionMode === 'allocate' ? 'be-btn-primary' : 'be-btn-secondary'}`} onClick={() => { setActionMode('allocate'); setSelectedInvestment(''); }}>
                  <I icon={Plus} size={14} /> Allocate
                </button>
                <button className={`be-btn be-btn-sm ${actionMode === 'unallocate' ? 'be-btn-primary' : 'be-btn-secondary'}`} onClick={() => { setActionMode('unallocate'); setSelectedInvestment(''); }}>
                  <I icon={RotateCcw} size={14} /> Unallocate
                </button>
                <button className="be-btn be-btn-ghost be-btn-sm" onClick={() => setSelectedFund(null)}>Back</button>
              </div>

              {actionMode && (
                <form onSubmit={handleSubmit}>
                  {message && (
                    <div className={`adm-validation-banner adm-validation-banner--${message.type}`} style={{ marginBottom: 10 }}>
                      <I icon={AlertTriangle} size={14} /> {message.text}
                    </div>
                  )}
                  <label className="adm-field">
                    <span>Investment</span>
                    <select value={selectedInvestment} onChange={e => setSelectedInvestment(e.target.value)} required>
                      <option value="">Select investment</option>
                      {fund.investments?.map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.companyName || 'Unnamed'} — ₹{(inv.amount || 0).toLocaleString()}</option>
                      ))}
                    </select>
                  </label>
                  <label className="adm-field">
                    <span>Amount (INR)</span>
                    <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} required />
                    {actionMode === 'allocate' && (
                      <small style={{ color: 'var(--be-slate)', fontSize: 11 }}>Available cash: ₹{cash.toLocaleString()}</small>
                    )}
                  </label>
                  <label className="adm-field">
                    <span>Reason</span>
                    <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Why this allocation?" />
                  </label>
                  <button type="submit" className="be-btn be-btn-primary be-btn-block" disabled={submitting}>
                    {submitting ? 'Processing...' : (actionMode === 'allocate' ? 'Allocate to Investment' : 'Unallocate to Cash')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* AUM — Capital Flow Tab                                                     */
/* -------------------------------------------------------------------------- */

export default AumAllocationsTab;

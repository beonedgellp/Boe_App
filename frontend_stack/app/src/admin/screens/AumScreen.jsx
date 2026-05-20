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
import StatTile from '../components/StatTile.jsx';
import EmptyTableRow from '../components/EmptyTableRow.jsx';
import { fmtInt } from '../helpers/formatters.js';
import { clone } from '../helpers/formatters.js';
import AumAllocationsTab from './AumAllocationsTab.jsx';
import AumCapitalTab from './AumCapitalTab.jsx';
import AumRedemptionsTab from './AumRedemptionsTab.jsx';

function AumScreen({ funds = [], auditLogs = [], onCreate, onUpdate, onDelete, onUserDetail }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stageFilter, setStageFilter] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState(null);
  const [selectedFundId, setSelectedFundId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [lifecycleConfirm, setLifecycleConfirm] = useState(null);
  const [previewFund, setPreviewFund] = useState(null);
  const [allocationFund, setAllocationFund] = useState(null);
  const [capitalTransactions, setCapitalTransactions] = useState([]);
  const [redemptionRequests, setRedemptionRequests] = useState([]);
  const [aumLoading, setAumLoading] = useState(false);

  const emptyForm = {
    name: '',
    tagline: '',
    lifecycleStage: 'draft',
    status: 'coming_soon',
    totalPoolSize: '',
    initialInvestment: '',
    currentValue: '',
    launchDate: '',
    minSip: '',
    minLumpsum: '',
    riskLabel: '',
    sectors: [],
    investments: [],
    chartConfig: {
      showSectorDistribution: true,
      showInvestmentBreakdown: false,
      showCompanyNames: false,
    },
  };

  const [form, setForm] = useState(emptyForm);

  const selectedFund = funds.find(f => f.id === selectedFundId) || null;

  const LIFECYCLE_STAGES = ['draft', 'published', 'active', 'paused', 'closed', 'archived'];

  const STAGE_DESCRIPTIONS = {
    draft: 'Admin only, not visible to users',
    published: 'Visible to users as "Coming Soon"',
    active: 'Visible and investable',
    paused: 'Visible but not investable',
    closed: 'Visible for historical reference only',
    archived: 'Hidden from all users',
  };

  function deriveStatusFromLifecycle(stage) {
    if (stage === 'active') return 'active';
    if (['published', 'paused', 'closed'].includes(stage)) return 'coming_soon';
    return 'coming_soon';
  }

  function openCreate() {
    setSelectedFundId(null);
    setEditorMode('create');
    setForm(clone(emptyForm));
    setFormError('');
    setEditorOpen(true);
  }

  function openEdit(fund) {
    setSelectedFundId(fund.id);
    setEditorMode('edit');
    setForm({
      name: fund.name || '',
      tagline: fund.tagline || '',
      lifecycleStage: fund.lifecycleStage || 'draft',
      status: fund.status || 'coming_soon',
      totalPoolSize: fund.totalPoolSize ?? '',
      initialInvestment: fund.initialInvestment ?? '',
      currentValue: fund.currentValue ?? '',
      launchDate: fund.launchDate ?? '',
      minSip: fund.minSip ?? '',
      minLumpsum: fund.minLumpsum ?? '',
      riskLabel: fund.riskLabel || '',
      sectors: clone(fund.sectors || []),
      investments: clone(fund.investments || []),
      chartConfig: {
        showSectorDistribution: fund.chartConfig?.showSectorDistribution !== false,
        showInvestmentBreakdown: fund.chartConfig?.showInvestmentBreakdown === true,
        showCompanyNames: fund.chartConfig?.showCompanyNames === true,
      },
    });
    setFormError('');
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditorMode(null);
    setSelectedFundId(null);
    setFormError('');
    setLifecycleConfirm(null);
  }

  function updateField(key) {
    return (e) => setForm(s => ({ ...s, [key]: e.target.value }));
  }

  function updateNumberField(key) {
    return (e) => setForm(s => ({ ...s, [key]: e.target.value === '' ? '' : Number(e.target.value) }));
  }

  function addSector() {
    setForm(s => ({
      ...s,
      sectors: [...s.sectors, { id: `sec_${Date.now()}`, name: '', percentage: 0, color: '#4F46E5' }]
    }));
  }

  function updateSector(index, field, value) {
    setForm(s => {
      const sectors = [...s.sectors];
      sectors[index] = { ...sectors[index], [field]: field === 'percentage' ? (value === '' ? 0 : Number(value)) : value };
      return { ...s, sectors };
    });
  }

  function removeSector(index) {
    setForm(s => ({ ...s, sectors: s.sectors.filter((_, i) => i !== index) }));
  }

  function addInvestment() {
    setForm(s => ({
      ...s,
      investments: [...s.investments, { id: `inv_${Date.now()}`, companyName: '', amount: 0, sectorId: '' }]
    }));
  }

  function updateInvestment(index, field, value) {
    setForm(s => {
      const investments = [...s.investments];
      investments[index] = { ...investments[index], [field]: field === 'amount' ? (value === '' ? 0 : Number(value)) : value };
      return { ...s, investments };
    });
  }

  function removeInvestment(index) {
    setForm(s => ({ ...s, investments: s.investments.filter((_, i) => i !== index) }));
  }

  function updateChartConfig(key) {
    return (e) => setForm(s => ({
      ...s,
      chartConfig: { ...s.chartConfig, [key]: e.target.checked }
    }));
  }

  function handleLifecycleClick(stage) {
    if (stage === form.lifecycleStage) return;
    const destructive = (form.lifecycleStage === 'active' && stage === 'archived') ||
                        (form.lifecycleStage === 'active' && stage === 'draft');
    if (destructive) {
      setLifecycleConfirm(stage);
      return;
    }
    applyLifecycleChange(stage);
  }

  function applyLifecycleChange(stage) {
    setForm(s => ({
      ...s,
      lifecycleStage: stage,
      status: deriveStatusFromLifecycle(stage),
    }));
    setLifecycleConfirm(null);
  }

  const sectorTotal = form.sectors.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);
  const poolSizeNum = form.totalPoolSize === '' ? 0 : Number(form.totalPoolSize);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Fund name is required.'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        tagline: form.tagline.trim() || undefined,
        lifecycleStage: form.lifecycleStage,
        status: form.status,
        totalPoolSize: form.totalPoolSize === '' ? undefined : Number(form.totalPoolSize),
        minSip: form.minSip === '' ? undefined : Number(form.minSip),
        minLumpsum: form.minLumpsum === '' ? undefined : Number(form.minLumpsum),
        riskLabel: form.riskLabel.trim() || undefined,
        sectors: form.sectors.map(s => ({ ...s, percentage: Number(s.percentage) || 0 })),
        investments: form.investments.map(i => ({ ...i, amount: Number(i.amount) || 0 })),
        chartConfig: { ...form.chartConfig },
        showSectorChart: form.chartConfig.showSectorDistribution,
        showInvestmentChart: form.chartConfig.showInvestmentBreakdown,
      };
      if (editorMode === 'create') {
        await onCreate?.(payload);
      } else {
        await onUpdate?.(selectedFundId, payload);
      }
      closeEditor();
    } catch (err) {
      setFormError(err?.message || `Failed to ${editorMode === 'create' ? 'create' : 'update'} fund pool.`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm?.id) return;
    setSubmitting(true);
    try {
      await onDelete?.(deleteConfirm.id);
      if (selectedFundId === deleteConfirm.id) closeEditor();
    } catch (err) {
      setFormError(err?.message || 'Failed to delete fund pool.');
    } finally {
      setSubmitting(false);
      setDeleteConfirm(null);
    }
  }

  /* Replaced by shared components: RiskBadge, LifecycleBadge, StatusBadge
     from ../../shared/components/Badges.jsx */

  const totalFunds = funds.length;
  const totalAum = funds.reduce((sum, f) => sum + (Number(f.totalPoolSize) || 0), 0);
  const activeFunds = funds.filter(f => f.lifecycleStage === 'active').length;
  const draftFunds = funds.filter(f => f.lifecycleStage === 'draft').length;

  const fundAuditLogs = (auditLogs || [])
    .filter(log => String(log.entityType || '').toLowerCase() === 'fund')
    .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0))
    .slice(0, 5);

  const filteredFunds = stageFilter === 'all'
    ? funds
    : funds.filter(f => (f.lifecycleStage || 'draft') === stageFilter);

  const selectedFundAuditLogs = selectedFund
    ? (auditLogs || []).filter(log =>
        String(log.entityType || '').toLowerCase() === 'fund' &&
        String(log.entityId || '') === String(selectedFund.id)
      ).sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0)).slice(0, 10)
    : [];
  return (
    <>
      {editorOpen ? (
        <div className="adm-fund-editor-page">
          <div className="adm-fund-editor-header">
            <button
              type="button"
              className="be-btn be-btn-secondary be-btn-sm"
              onClick={closeEditor}
              disabled={submitting}
            >
              <I icon={ArrowLeft} size={16} /> Back to AUM
            </button>
            <h2 className="adm-fund-editor-header-title">
              {editorMode === 'create' ? 'Create Fund Pool' : `Edit: ${selectedFund?.name || 'Fund Pool'}`}
            </h2>
            <div className="adm-fund-editor-header-actions">
              {editorMode === 'edit' && (
                <button
                  type="button"
                  className="be-btn be-btn-danger"
                  onClick={() => setDeleteConfirm({ id: selectedFundId, name: selectedFund?.name })}
                  disabled={submitting}
                >
                  <I icon={Trash2} size={14} /> Delete
                </button>
              )}
              <button type="button" className="be-btn be-btn-secondary" onClick={closeEditor} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" form="fund-editor-form" className="be-btn be-btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Fund Pool'}
              </button>
            </div>
          </div>

          <form id="fund-editor-form" onSubmit={handleSubmit} className="adm-fund-editor-layout">
            <div className="adm-fund-editor-main">
              {formError && (
                <div className="adm-validation-banner adm-validation-banner--error" style={{ marginBottom: 0 }}>
                  <I icon={AlertTriangle} size={14} /> {formError}
                </div>
              )}

              {/* Section 1: Basic Information */}
              <div className="adm-fund-editor-section">
                <div className="adm-fund-editor-section-title"><I icon={FileText} size={16} /> Basic Information</div>
                <div className="adm-form-grid">
                  <label className="adm-field">
                    <span>Fund Name *</span>
                    <input type="text" required value={form.name} onChange={updateField('name')} />
                  </label>
                  <label className="adm-field">
                    <span>Lifecycle Stage</span>
                    <select value={form.lifecycleStage} onChange={(e) => applyLifecycleChange(e.target.value)}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="closed">Closed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <label className="adm-field adm-field-wide">
                    <span>Tagline</span>
                    <input type="text" value={form.tagline} onChange={updateField('tagline')} />
                  </label>
                  <label className="adm-field">
                    <span>User Status</span>
                    <select value={form.status} onChange={updateField('status')} disabled>
                      <option value="active">Active</option>
                      <option value="coming_soon">Coming Soon</option>
                    </select>
                    <small style={{ color: 'var(--be-slate)', fontSize: 11 }}>Auto-derived from lifecycle stage</small>
                  </label>
                  <label className="adm-field">
                    <span>Total Pool Size (INR)</span>
                    <input type="number" min="0" value={form.totalPoolSize} onChange={updateNumberField('totalPoolSize')} />
                  </label>
                  <label className="adm-field">
                    <span>Initial Investment (INR)</span>
                    <input type="number" min="0" value={form.initialInvestment} onChange={updateNumberField('initialInvestment')} />
                    <small style={{ color: 'var(--be-slate)', fontSize: 11 }}>Starting capital when fund launched</small>
                  </label>
                  <label className="adm-field">
                    <span>Current Value (INR)</span>
                    <input type="number" min="0" value={form.currentValue} onChange={updateNumberField('currentValue')} />
                    <small style={{ color: 'var(--be-slate)', fontSize: 11 }}>Current total fund value</small>
                  </label>
                  <label className="adm-field">
                    <span>Launch Date</span>
                    <input type="date" value={form.launchDate} onChange={updateField('launchDate')} />
                    <small style={{ color: 'var(--be-slate)', fontSize: 11 }}>When the fund started operations</small>
                  </label>
                  <label className="adm-field">
                    <span>Min SIP</span>
                    <input type="number" min="0" value={form.minSip} onChange={updateNumberField('minSip')} />
                  </label>
                  <label className="adm-field">
                    <span>Min Lumpsum</span>
                    <input type="number" min="0" value={form.minLumpsum} onChange={updateNumberField('minLumpsum')} />
                  </label>
                  <label className="adm-field">
                    <span>Risk Profile</span>
                    <select value={form.riskLabel} onChange={updateField('riskLabel')}>
                      <option value="">Select risk profile</option>
                      <option value="high">Growth (High)</option>
                      <option value="moderate_high">Growth (Moderate-High)</option>
                      <option value="moderate">Balanced (Moderate)</option>
                      <option value="low_moderate">Balanced (Low-Moderate)</option>
                      <option value="low">Conservative (Low)</option>
                    </select>
                    {form.riskLabel && (
                      <small style={{ color: 'var(--be-slate)', fontSize: 11, marginTop: 4, display: 'block' }}>
                        Client sees: <strong>{(() => { const map = { high: 'Growth', moderate_high: 'Growth', moderate: 'Balanced', low_moderate: 'Balanced', low: 'Conservative' }; return map[form.riskLabel] || 'Balanced'; })()}</strong>
                      </small>
                    )}
                  </label>
                </div>
                {/* Auto-computed Performance Metrics */}
                {(() => {
                  const initial = Number(form.initialInvestment) || 0;
                  const current = Number(form.currentValue) || 0;
                  const launch = form.launchDate ? new Date(form.launchDate) : null;
                  const now = new Date();
                  const hasAge = launch && !Number.isNaN(launch.getTime()) && launch <= now;
                  const ageDays = hasAge ? Math.floor((now - launch) / (1000 * 60 * 60 * 24)) : 0;
                  const ageYears = ageDays / 365.25;
                  const totalReturn = initial > 0 ? ((current - initial) / initial) * 100 : 0;
                  const annualized = initial > 0 && current > 0 && ageYears > 0
                    ? (Math.pow(current / initial, 1 / ageYears) - 1) * 100
                    : 0;
                  if (initial === 0 && current === 0 && !hasAge) return null;
                  return (
                    <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--be-bone)', borderRadius: 'var(--be-radius-sm)', border: '1px solid var(--be-border)' }}>
                      <span className="be-eyebrow" style={{ display: 'block', marginBottom: 8 }}>Auto-computed Metrics</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--be-slate)' }}>Total Return</div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: totalReturn >= 0 ? 'var(--be-green)' : 'var(--be-red)', fontFamily: 'var(--be-font-mono)' }}>
                            {totalReturn > 0 ? '+' : ''}{totalReturn.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--be-slate)' }}>Fund Age</div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--be-ink)', fontFamily: 'var(--be-font-mono)' }}>
                            {hasAge ? `${Math.floor(ageYears)}y ${Math.floor((ageDays % 365) / 30)}mo` : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--be-slate)' }}>Annualized Return</div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: annualized >= 0 ? 'var(--be-green)' : 'var(--be-red)', fontFamily: 'var(--be-font-mono)' }}>
                            {annualized > 0 ? '+' : ''}{annualized.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Section 2: Lifecycle Workflow */}
              <div className="adm-fund-editor-section">
                <div className="adm-fund-editor-section-title"><I icon={Activity} size={16} /> Lifecycle Workflow</div>
                <div className="adm-lifecycle-bar">
                  {LIFECYCLE_STAGES.map((stage, idx) => (
                    <div key={stage} className="adm-lifecycle-item">
                      <button
                        type="button"
                        className={`adm-lifecycle-stage ${form.lifecycleStage === stage ? 'adm-lifecycle-stage--active' : ''}`}
                        onClick={() => handleLifecycleClick(stage)}
                      >
                        {stage.charAt(0).toUpperCase() + stage.slice(1)}
                      </button>
                      {idx < LIFECYCLE_STAGES.length - 1 && (
                        <I icon={ChevronRight} size={14} className="adm-lifecycle-arrow" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="adm-lifecycle-desc">
                  <strong>{form.lifecycleStage.charAt(0).toUpperCase() + form.lifecycleStage.slice(1)}:</strong> {STAGE_DESCRIPTIONS[form.lifecycleStage]}
                </div>
              </div>

              {/* Section 3: Sector Distribution */}
              <div className="adm-fund-editor-section">
                <div className="adm-fund-editor-section-title" style={{ justifyContent: 'space-between' }}>
                  <span><I icon={PieChart} size={16} /> Sector Distribution</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
  
                  </div>
                </div>

                {selectedFund?.analytics?.sectorValid === false && (
                  <div className="adm-validation-banner adm-validation-banner--error">
                    <I icon={AlertTriangle} size={14} /> Sector allocations do not sum to 100%
                  </div>
                )}
                <div className="adm-editor-list">
                  {form.sectors.map((sector, index) => (
                    <div className="adm-sector-row" key={sector.id}>
                      <input value={sector.name} onChange={(e) => updateSector(index, 'name', e.target.value)} placeholder="Sector name" />
                      <input type="number" min="0" max="100" value={sector.percentage} onChange={(e) => updateSector(index, 'percentage', e.target.value)} placeholder="%" />
                      <input value={sector.color} onChange={(e) => updateSector(index, 'color', e.target.value)} placeholder="#hex" />
                      <button type="button" className="adm-icon-btn" onClick={() => removeSector(index)} aria-label="Remove sector"><I icon={Trash2} size={14} /></button>
                    </div>
                  ))}
                </div>
                {/* Live sector distribution preview */}
                {form.sectors.length > 0 && (
                  <div style={{ margin: '12px 0', padding: '10px 12px', background: 'var(--be-bone)', borderRadius: 'var(--be-radius-sm)', border: `1px solid ${sectorTotal === 100 ? 'var(--be-border)' : 'var(--be-red)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span className="be-eyebrow" style={{ fontSize: 10 }}>Distribution preview</span>
                      <span className={`be-eyebrow ${sectorTotal === 100 ? '' : 'adm-tone-red'}`} style={{ fontSize: 10 }}>
                        {sectorTotal === 100 ? '100%' : `${sectorTotal}% — must equal 100%`}
                      </span>
                    </div>
                    <SectorMiniBar sectors={form.sectors} height={8} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', marginTop: 8 }}>
                      {form.sectors.map((s, i) => (
                        <span key={s.id || i} style={{ fontSize: 11, color: 'var(--be-slate)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                          {s.name || 'Unnamed'} {s.percentage}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <button type="button" className="be-btn be-btn-secondary be-btn-sm" onClick={addSector}><I icon={Plus} size={14} /> Add Sector</button>
                  <span className={`be-eyebrow ${sectorTotal === 100 ? 'adm-tone-green' : 'adm-tone-red'}`}>Total: {sectorTotal}%</span>
                </div>
              </div>

              {/* Section 4: Investment Distribution */}
              <div className="adm-fund-editor-section">
                <div className="adm-fund-editor-section-title" style={{ justifyContent: 'space-between' }}>
                  <span><I icon={Briefcase} size={16} /> Investment Distribution</span>
                  {selectedFund?.analytics && (
                    <span className="adm-cell-meta">
                      ₹{(selectedFund.analytics.totalInvested ?? 0).toLocaleString()} deployed of ₹{(selectedFund.totalPoolSize ?? poolSizeNum).toLocaleString()} pool
                    </span>
                  )}
                </div>

                <div className="adm-editor-list">
                  {form.investments.map((inv, index) => {
                    const pct = poolSizeNum > 0 ? ((Number(inv.amount) || 0) / poolSizeNum * 100).toFixed(2) : '0.00';
                    return (
                      <div className="adm-investment-row" key={inv.id}>
                        <input value={inv.companyName} onChange={(e) => updateInvestment(index, 'companyName', e.target.value)} placeholder="Company name" />
                        <input type="number" min="0" value={inv.amount} onChange={(e) => updateInvestment(index, 'amount', e.target.value)} placeholder="Amount (INR)" />
                        <select value={inv.sectorId} onChange={(e) => updateInvestment(index, 'sectorId', e.target.value)}>
                          <option value="">Select sector</option>
                          {form.sectors.map(s => (
                            <option key={s.id} value={s.id}>{s.name || 'Unnamed'}</option>
                          ))}
                        </select>
                        <span className="adm-cell-meta" style={{ textAlign: 'right', minWidth: 60 }}>{pct}%</span>
                        <button type="button" className="adm-icon-btn" onClick={() => removeInvestment(index)} aria-label="Remove investment"><I icon={Trash2} size={14} /></button>
                      </div>
                    );
                  })}
                </div>
                <button type="button" className="be-btn be-btn-secondary be-btn-sm" onClick={addInvestment}><I icon={Plus} size={14} /> Add Investment</button>
                <p style={{ fontSize: 12, color: 'var(--be-slate)', marginTop: 8 }}>Actual amounts are admin-only and never exposed to clients.</p>
              </div>
            </div>

            <div className="adm-fund-editor-side">
              {/* Section 5: Visibility Controls */}
              <div className="adm-fund-editor-section">
                <div className="adm-fund-editor-section-title"><I icon={Eye} size={16} /> Visibility Controls</div>
                <div className="adm-visibility-group">
                  <label className="adm-chart-toggle">
                    <input type="checkbox" checked={form.chartConfig.showSectorDistribution} onChange={updateChartConfig('showSectorDistribution')} />
                    <span>Show sector distribution chart</span>
                  </label>
                  <label className="adm-chart-toggle">
                    <input type="checkbox" checked={form.chartConfig.showInvestmentBreakdown} onChange={updateChartConfig('showInvestmentBreakdown')} />
                    <span>Show investment breakdown list</span>
                  </label>
                  <label className="adm-chart-toggle">
                    <input type="checkbox" checked={form.chartConfig.showCompanyNames} onChange={updateChartConfig('showCompanyNames')} />
                    <span>Show company names in breakdown</span>
                  </label>
                </div>
                <p className="adm-cell-meta" style={{ marginTop: 8 }}>Users will only see what you enable above.</p>
              </div>

              {/* Section 5b: Client Preview */}
              <div className="adm-fund-editor-section">
                <div className="adm-fund-editor-section-title"><I icon={Eye} size={16} /> Client Preview</div>
                <div style={{ fontSize: 12, color: 'var(--be-slate)', marginBottom: 10 }}>
                  This is how clients will see your fund card:
                </div>
                {(() => {
                  const previewFund = {
                    id: selectedFundId || 'preview',
                    name: form.name || 'Untitled Fund',
                    tagline: form.tagline || 'No tagline set',
                    status: form.status,
                    lifecycleStage: form.lifecycleStage,
                    riskLabel: form.riskLabel,
                    totalPoolSize: form.totalPoolSize === '' ? 0 : Number(form.totalPoolSize),
                    minSip: form.minSip === '' ? 0 : Number(form.minSip),
                    sectors: form.sectors.filter(s => s.percentage > 0),
                    analytics: {
                      fundAge: (() => {
                        const launch = form.launchDate ? new Date(form.launchDate) : null;
                        if (!launch || Number.isNaN(launch.getTime())) return null;
                        const days = Math.floor((new Date() - launch) / (1000 * 60 * 60 * 24));
                        const y = Math.floor(days / 365);
                        const m = Math.floor((days % 365) / 30);
                        return { display: `${y}y ${m}mo` };
                      })(),
                    },
                  };
                  const isActive = previewFund.status === 'active';
                  return (
                    <div
                      style={{
                        background: 'var(--be-bone)',
                        border: `2px solid ${isActive ? 'var(--be-gold)' : 'var(--be-border-strong)'}`,
                        borderRadius: 'var(--be-radius-md)',
                        padding: 14,
                        cursor: 'default',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <h4 style={{ fontFamily: 'var(--be-font-serif)', fontSize: 15, fontWeight: 600, margin: 0 }}>{previewFund.name}</h4>
                        <StatusBadge status={previewFund.status} size="sm" />
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--be-slate)', margin: '0 0 10px' }}>{previewFund.tagline}</p>
                      <div style={{ display: 'flex', gap: 10, fontSize: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600 }}>₹{(previewFund.totalPoolSize / 1e5).toFixed(1)}L</span>
                        {previewFund.analytics.fundAge && (
                          <span style={{ color: 'var(--be-slate)' }}>{previewFund.analytics.fundAge.display}</span>
                        )}
                        <span>{previewFund.sectors.length} sectors</span>

                      </div>
                      <SectorMiniBar sectors={previewFund.sectors} height={6} style={{ marginBottom: 10 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <RiskBadge riskLabel={previewFund.riskLabel} size="sm" />
                        <span style={{ fontSize: 11, color: 'var(--be-slate-2)' }}>Min SIP ₹{previewFund.minSip.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Section 6: Audit Trail */}
              {editorMode === 'edit' && selectedFund && (
                <div className="adm-fund-editor-section">
                  <div className="adm-fund-editor-section-title"><I icon={ClipboardList} size={16} /> Audit Trail</div>
                  {selectedFundAuditLogs.length === 0 ? (
                    <div className="adm-empty-state">No audit entries for this fund.</div>
                  ) : (
                    <div className="adm-audit-log">
                      <table>
                        <thead>
                          <tr>
                            <th>Action</th>
                            <th>Timestamp</th>
                            <th>Changes Summary</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFundAuditLogs.map((log, idx) => (
                            <tr key={idx}>
                              <td><span className="adm-code">{log.action || '—'}</span></td>
                              <td className="adm-cell-meta">{log.timestamp || log.createdAt || '—'}</td>
                              <td className="adm-cell-meta">{log.changesSummary || log.details || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Summary Card */}
              <div className="adm-fund-editor-section">
                <div className="adm-fund-editor-section-title"><I icon={FileText} size={16} /> Summary</div>
                <div className="adm-review-grid">
                  <div className="adm-review-field">
                    <span>Fund Name</span>
                    <strong>{form.name || '—'}</strong>
                  </div>
                  <div className="adm-review-field">
                    <span>Lifecycle</span>
                    <strong>{form.lifecycleStage.charAt(0).toUpperCase() + form.lifecycleStage.slice(1)}</strong>
                  </div>
                  <div className="adm-review-field">
                    <span>Sectors</span>
                    <strong>{form.sectors.length}</strong>
                  </div>
                  <div className="adm-review-field">
                    <span>Investments</span>
                    <strong>{form.investments.length}</strong>
                  </div>
                  <div className="adm-review-field">
                    <span>Pool Size</span>
                    <strong>{form.totalPoolSize ? `₹${Number(form.totalPoolSize).toLocaleString()}` : '—'}</strong>
                  </div>
                  <div className="adm-review-field">
                    <span>Sector Total</span>
                    <strong className={sectorTotal === 100 ? 'adm-tone-green' : 'adm-tone-red'}>{sectorTotal}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Delete confirmation modal */}
          {deleteConfirm && (
            <div className="adm-review-overlay" role="presentation" onMouseDown={() => !submitting && setDeleteConfirm(null)}>
              <section className="adm-review-panel" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
                <div className="adm-review-head">
                  <div>
                    <span className="be-eyebrow">Confirm deletion</span>
                    <h2>Delete &ldquo;{deleteConfirm.name}&rdquo;?</h2>
                  </div>
                  <button className="adm-icon-btn" onClick={() => setDeleteConfirm(null)} aria-label="Close" disabled={submitting}><I icon={X}/></button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--be-slate)' }}>This action cannot be undone. The fund pool will be permanently removed.</p>
                <div className="adm-review-actions">
                  <button className="be-btn be-btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={submitting}>Cancel</button>
                  <button className="be-btn be-btn-danger" onClick={handleDelete} disabled={submitting}>
                    {submitting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* Lifecycle confirmation modal */}
          {lifecycleConfirm && (
            <div className="adm-review-overlay" role="presentation" onMouseDown={() => setLifecycleConfirm(null)}>
              <section className="adm-review-panel" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
                <div className="adm-review-head">
                  <div>
                    <span className="be-eyebrow">Confirm stage change</span>
                    <h2>Change lifecycle stage?</h2>
                  </div>
                  <button className="adm-icon-btn" onClick={() => setLifecycleConfirm(null)} aria-label="Close"><I icon={X}/></button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--be-slate)' }}>
                  You are about to move this fund from <strong>{form.lifecycleStage}</strong> to <strong>{lifecycleConfirm}</strong>.
                  This may affect visibility for users.
                </p>
                <div className="adm-review-actions">
                  <button className="be-btn be-btn-secondary" onClick={() => setLifecycleConfirm(null)}>Cancel</button>
                  <button className="be-btn be-btn-primary" onClick={() => applyLifecycleChange(lifecycleConfirm)}>
                    Confirm Change
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      ) : (
        <div className="adm-screen">      {/* Tabs */}
      <div className="adm-fund-tabs">
        <button className={activeTab === 'overview' ? 'is-active' : ''} onClick={() => setActiveTab('overview')}>
          <I icon={BarChart3} size={14}/> Overview
        </button>
        <button className={activeTab === 'funds' ? 'is-active' : ''} onClick={() => setActiveTab('funds')}>
          <I icon={Layers} size={14}/> Funds
        </button>
        <button className={activeTab === 'allocations' ? 'is-active' : ''} onClick={() => setActiveTab('allocations')}>
          <I icon={PieChart} size={14}/> Allocations
        </button>
        <button className={activeTab === 'capital' ? 'is-active' : ''} onClick={() => setActiveTab('capital')}>
          <I icon={TrendingUp} size={14}/> Capital Flow
        </button>
        <button className={activeTab === 'redemptions' ? 'is-active' : ''} onClick={() => setActiveTab('redemptions')}>
          <I icon={RotateCcw} size={14}/> Redemptions
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="adm-fund-dashboard">
          <div className="adm-fund-stats">
            <StatTile label="Total Funds" value={fmtInt(totalFunds)} icon={Layers} tone="slate"/>
            <StatTile label="Total AUM" value={`₹${(totalAum / 1e7).toFixed(2)}Cr`} icon={Briefcase} tone="green"/>
            <StatTile label="Active Funds" value={fmtInt(activeFunds)} icon={TrendingUp} tone="green"/>
            <StatTile label="Funds in Draft" value={fmtInt(draftFunds)} icon={Clock} tone="amber"/>
          </div>

          <div className="adm-card">
            <div className="adm-card-head">
              <div>
                <span className="be-eyebrow">Recent Activity</span>
                <h3 className="adm-card-title">Fund audit trail</h3>
              </div>
              <button className="be-btn be-btn-primary be-btn-sm" onClick={openCreate}><I icon={Plus} size={14}/> Create New Fund Pool</button>
            </div>
            {fundAuditLogs.length === 0 ? (
              <div className="adm-empty-state">No recent fund activity recorded.</div>
            ) : (
              <div className="adm-audit-log">
                <table>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Timestamp</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundAuditLogs.map((log, idx) => (
                      <tr key={idx}>
                        <td><span className="adm-code">{log.action || '—'}</span></td>
                        <td>{log.entityName || log.entityId || '—'}</td>
                        <td className="adm-cell-meta">{log.timestamp || log.createdAt || '—'}</td>
                        <td className="adm-cell-meta">{log.changesSummary || log.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Funds */}
      {activeTab === 'funds' && (
        <div className="adm-fund-pools">
          <div className="adm-card adm-table">
            <div className="adm-card-head">
              <div>
                <span className="be-eyebrow">Funds</span>
                <h3 className="adm-card-title">All funds</h3>
              </div>
              <div className="adm-card-actions">
                <button className="be-btn be-btn-primary be-btn-sm" onClick={openCreate}><I icon={Plus} size={14}/> Create New Fund Pool</button>
              </div>
            </div>

            <div className="adm-toolbar">
              <div className="adm-filter">
                <I icon={Filter} size={14}/>
                <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                  <option value="all">All stages</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <span className="adm-fund-count">{filteredFunds.length} fund{filteredFunds.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="adm-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Lifecycle Stage</th>
                    <th>Status</th>
                    <th>Pool Size</th>
                    <th>Sectors</th>
                    <th>Investments</th>
                    <th className="adm-col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFunds.length === 0 && (
                    <EmptyTableRow colSpan={7}>No fund pools match the selected filter.</EmptyTableRow>
                  )}
                  {filteredFunds.map(f => (
                    <tr key={f.id || f.name}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{fontFamily:'var(--be-font-serif)',fontSize:15,fontWeight:600}}>{f.name}</span>
                          {f.sectors?.length > 0 && (
                            <SectorMiniBar sectors={f.sectors} height={5} style={{ maxWidth: 200 }} />
                          )}
                        </div>
                      </td>
                      <td><LifecycleBadge stage={f.lifecycleStage} size="sm" /></td>
                      <td><StatusBadge status={f.status} size="sm" /></td>
                      <td className="be-money">{f.totalPoolSize ?? f.aum ?? 0}</td>
                      <td className="be-num">{f.analytics?.sectorCount ?? f.sectors?.length ?? 0}</td>
                      <td className="be-num">{f.analytics?.investmentCount ?? f.investments?.length ?? 0}</td>
                      <td className="adm-cell-actions">
                        <button className="be-btn be-btn-secondary be-btn-sm" onClick={() => openEdit(f)}><I icon={Pencil} size={14}/> Edit</button>
                        <button className="be-btn be-btn-ghost be-btn-sm" onClick={() => setPreviewFund(f)}><I icon={Eye} size={14}/> Preview</button>
                        <button className="adm-icon-btn" onClick={() => navigator.clipboard?.writeText(f.id)} title="Copy ID"><I icon={Copy} size={14}/></button>
                        <button className="be-btn be-btn-danger be-btn-sm" onClick={() => setDeleteConfirm({ id: f.id, name: f.name })}><I icon={Trash2} size={14}/> Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="adm-review-overlay" role="presentation" onMouseDown={() => !submitting && setDeleteConfirm(null)}>
          <section className="adm-review-panel" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-review-head">
              <div>
                <span className="be-eyebrow">Confirm deletion</span>
                <h2>Delete &ldquo;{deleteConfirm.name}&rdquo;?</h2>
              </div>
              <button className="adm-icon-btn" onClick={() => setDeleteConfirm(null)} aria-label="Close" disabled={submitting}><I icon={X}/></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--be-slate)' }}>This action cannot be undone. The fund pool will be permanently removed.</p>
            <div className="adm-review-actions">
              <button className="be-btn be-btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={submitting}>Cancel</button>
              <button className="be-btn be-btn-danger" onClick={handleDelete} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Lifecycle confirmation modal */}
      {lifecycleConfirm && (
        <div className="adm-review-overlay" role="presentation" onMouseDown={() => setLifecycleConfirm(null)}>
          <section className="adm-review-panel" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-review-head">
              <div>
                <span className="be-eyebrow">Confirm stage change</span>
                <h2>Change lifecycle stage?</h2>
              </div>
              <button className="adm-icon-btn" onClick={() => setLifecycleConfirm(null)} aria-label="Close"><I icon={X}/></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--be-slate)' }}>
              You are about to move this fund from <strong>{form.lifecycleStage}</strong> to <strong>{lifecycleConfirm}</strong>.
              This may affect visibility for users.
            </p>
            <div className="adm-review-actions">
              <button className="be-btn be-btn-secondary" onClick={() => setLifecycleConfirm(null)}>Cancel</button>
              <button className="be-btn be-btn-primary" onClick={() => applyLifecycleChange(lifecycleConfirm)}>
                Confirm Change
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Client preview modal */}
      {previewFund && (
        <div className="adm-review-overlay" role="presentation" onMouseDown={() => setPreviewFund(null)}>
          <section className="adm-review-panel" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="adm-review-head">
              <div>
                <span className="be-eyebrow">Client preview</span>
                <h2>{previewFund.name}</h2>
              </div>
              <button className="adm-icon-btn" onClick={() => setPreviewFund(null)} aria-label="Close"><I icon={X}/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <LifecycleBadge stage={previewFund.lifecycleStage} />
                <StatusBadge status={previewFund.status} />
                <RiskBadge riskLabel={previewFund.riskLabel} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--be-slate)', margin: 0 }}>{previewFund.tagline}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                <div><span className="be-eyebrow">Pool Size</span><div className="be-money" style={{ fontSize: 16 }}>₹{(previewFund.totalPoolSize ?? 0).toLocaleString()}</div></div>
                <div><span className="be-eyebrow">Min SIP</span><div className="be-money" style={{ fontSize: 16 }}>₹{(previewFund.minSip ?? 0).toLocaleString()}</div></div>
              </div>
              {previewFund.sectors?.length > 0 && (
                <div>
                  <span className="be-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Sector Allocation</span>
                  <SectorMiniBar sectors={previewFund.sectors} height={8} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', marginTop: 8 }}>
                    {previewFund.sectors.map((s, i) => (
                      <span key={s.id || i} style={{ fontSize: 11, color: 'var(--be-slate)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                        {s.name || 'Unnamed'} {s.percentage}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="adm-review-actions" style={{ marginTop: 4 }}>
                <button className="be-btn be-btn-secondary" onClick={() => setPreviewFund(null)}>Close</button>
                <button className="be-btn be-btn-primary" onClick={() => { setPreviewFund(null); openEdit(previewFund); }}>Edit this fund</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab 3: Allocations */}
      {activeTab === 'allocations' && (
        <AumAllocationsTab funds={funds} />
      )}

      {/* Tab 4: Capital Flow */}
      {activeTab === 'capital' && (
        <AumCapitalTab funds={funds} />
      )}

      {/* Tab 5: Redemptions (Withdrawal Requests) */}
      {activeTab === 'redemptions' && (
        <AumRedemptionsTab onUserDetail={onUserDetail} />
      )}
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* AUM — Allocations Tab                                                      */
/* -------------------------------------------------------------------------- */

export default AumScreen;

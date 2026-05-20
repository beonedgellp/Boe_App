import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, RotateCcw, Wallet } from 'lucide-react';
import * as portfolioApi from '../services/portfolioApi.js';
import * as fundsApi from '../services/fundsApi.js';
import { fmtMoney, fmtNum, fmtPct, fmtUnits, fmtDate } from '../utils/format.js';
import MoneyValue from '../../shared/components/MoneyValue.jsx';

export default function Portfolio() {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [tab, setTab] = useState('all');
  const [redeemModal, setRedeemModal] = useState(null);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemType, setRedeemType] = useState('partial');
  const [redeemSubmitting, setRedeemSubmitting] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState(null);
  const [redeemStep, setRedeemStep] = useState('form');
  const [redeemPreview, setRedeemPreview] = useState(null);

  useEffect(() => { portfolioApi.getPortfolio().then(setPortfolio).catch(() => setPortfolio(null)); }, []);

  const activeMoneyStates = new Set([
    'units_allotted', 'units_pending', 'payment_received', 'mandate_pending',
    'mandate_active', 'redemption_requested', 'pending_payment',
  ]);
  const closedMoneyStates = new Set([
    'redemption_paid', 'failed_refund_pending', 'mandate_failed',
  ]);

  const holdings = useMemo(() => {
    if (!portfolio) return [];
    if (tab === 'active') return portfolio.holdings.filter((h) => activeMoneyStates.has(h.status));
    if (tab === 'closed') return portfolio.holdings.filter((h) => closedMoneyStates.has(h.status));
    return portfolio.holdings;
  }, [portfolio, tab]);

  const counts = useMemo(() => {
    if (!portfolio) return { all: 0, active: 0, closed: 0 };
    return {
      all: portfolio.holdings.length,
      active: portfolio.holdings.filter((h) => activeMoneyStates.has(h.status)).length,
      closed: portfolio.holdings.filter((h) => closedMoneyStates.has(h.status)).length,
    };
  }, [portfolio]);

  function holdingBadgeClass(status) {
    switch (status) {
      case 'units_allotted':
      case 'mandate_active':
        return 'be-badge-active';
      case 'units_pending':
      case 'redemption_requested':
      case 'pending_payment':
      case 'payment_received':
      case 'mandate_pending':
        return 'be-badge-paused';
      case 'mandate_failed':
      case 'failed_refund_pending':
        return 'be-badge-failed';
      case 'redemption_paid':
        return 'be-badge-neutral';
      default:
        return 'be-badge-neutral';
    }
  }
  function holdingBadgeLabel(status) {
    switch (status) {
      case 'units_allotted': return 'Allotted';
      case 'units_pending': return 'Pending Allotment';
      case 'redemption_requested': return 'Redemption Pending';
      case 'pending_payment': return 'Payment Pending';
      case 'payment_received': return 'Payment Received';
      case 'mandate_pending': return 'Mandate Pending';
      case 'mandate_active': return 'Mandate Active';
      case 'mandate_failed': return 'Mandate Failed';
      case 'redemption_paid': return 'Redeemed';
      case 'failed_refund_pending': return 'Refund Pending';
      default: return status;
    }
  }



  function resetRedeemModal() {
    setRedeemModal(null);
    setRedeemAmount('');
    setRedeemType('partial');
    setRedeemMessage(null);
    setRedeemStep('form');
    setRedeemPreview(null);
  }

  async function handleRedeemSubmit(e) {
    e.preventDefault();
    if (!redeemModal) return;
    const amount = redeemType === 'full' ? redeemModal.currentValue : Number(redeemAmount);
    if (!amount || amount <= 0) {
      setRedeemMessage({ type: 'error', text: 'Please enter a valid amount.' });
      return;
    }
    setRedeemSubmitting(true);
    setRedeemMessage(null);
    try {
      const preview = await fundsApi.previewWithdrawal(redeemModal.fundId, amount);
      setRedeemPreview(preview);
      setRedeemStep('preview');
    } catch (err) {
      setRedeemMessage({ type: 'error', text: err.message || 'Failed to load redemption preview.' });
    } finally {
      setRedeemSubmitting(false);
    }
  }

  async function handleConfirmRedemption() {
    if (!redeemPreview) return;
    setRedeemSubmitting(true);
    setRedeemMessage(null);
    try {
      await fundsApi.createWithdrawal(redeemPreview.id);
      setRedeemMessage({ type: 'success', text: 'Redemption request submitted. Awaiting admin approval.' });
      setTimeout(() => {
        resetRedeemModal();
      }, 2000);
    } catch (err) {
      setRedeemMessage({ type: 'error', text: err.message || 'Failed to submit redemption request.' });
    } finally {
      setRedeemSubmitting(false);
    }
  }

  return (
    <div className="apk-screen apk-portfolio-screen">
      <header className="apk-portfolio-header">
        <div>
          <span className="be-eyebrow">Your investments</span>
          <h1 className="apk-h">Portfolio</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="be-btn be-btn-ghost be-btn-sm" onClick={() => navigate('/app/withdrawals')}>
            <RotateCcw size={14} /> Withdrawals
          </button>
          {portfolio && (
            <div className="apk-portfolio-asof" aria-label={`Portfolio updated ${fmtDate(portfolio.asOf, { withTime: true })}`}>
              <span>Updated</span>
              <strong>{fmtDate(portfolio.asOf)}</strong>
            </div>
          )}
        </div>
      </header>

      {!portfolio ? (
        <>
          <div className="be-card apk-portfolio-summary-skeleton">
            <div className="apk-skel" style={{ height: 14, width: '35%', marginBottom: 10 }} />
            <div className="apk-skel" style={{ height: 44, width: '55%', marginBottom: 8 }} />
            <div className="apk-portfolio-summary-grid-skeleton">
              {[1,2].map(i => <div key={i} className="apk-skel" style={{ height: 44 }} />)}
            </div>
          </div>
          <div className="apk-holdings-list-skeleton">
            {[1,2].map(i => (
              <div key={i} className="be-card apk-holding-skeleton">
                <div className="apk-skel" style={{ height: 18, width: '65%', marginBottom: 6 }} />
                <div className="apk-skel" style={{ height: 14, width: '35%', marginBottom: 12 }} />
                <div className="apk-holding-metrics-skeleton">
                  {[1,2].map(j => <div key={j} className="apk-skel" style={{ height: 36 }} />)}
                </div>
                <div className="apk-skel" style={{ height: 48, marginTop: 12 }} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <section className="be-card apk-portfolio apk-portfolio-summary" aria-label="Portfolio summary">
          <div className="apk-portfolio-hero">
            <span className="be-eyebrow apk-portfolio-eye">Your investments</span>
            <div className="apk-portfolio-num be-money"><MoneyValue amount={portfolio.invested} source={portfolio.source} asOf={portfolio.asOf} showBadge={false} /></div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--be-slate)' }}>
              Total invested
            </div>
          </div>
          <dl className="apk-portfolio-grid apk-portfolio-summary-grid">
            <div>
              <dt className="apk-portfolio-mini-l">Holdings</dt>
              <dd className="apk-portfolio-mini-v be-num">{counts.active} active</dd>
            </div>
            <div>
              <dt className="apk-portfolio-mini-l">Closed</dt>
              <dd className="apk-portfolio-mini-v be-num">{counts.closed} closed</dd>
            </div>
          </dl>
        </section>
      )}

      <div className="apk-section-head apk-portfolio-section-head">
        <div>
          <span className="be-eyebrow">Holdings</span>
          {portfolio && <div className="apk-portfolio-section-count">{holdings.length} shown</div>}
        </div>
      </div>

      <div className="apk-tabs apk-portfolio-tabs" role="tablist" aria-label="Holdings filter">
        {[['all','All'],['active','Active'],['closed','Closed']].map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? 'is-active' : ''}
            onClick={() => setTab(k)}
          >
            {l}
            <span className="apk-tab-count" aria-hidden="true">{counts[k] || 0}</span>
          </button>
        ))}
      </div>

      {!portfolio ? null : holdings.length === 0 ? (
        <div className="be-card apk-empty apk-portfolio-empty">
          <div className="apk-empty-icon">
            <PieChart size={36} strokeWidth={1.5} />
          </div>
          <h2 className="apk-h-sm">No holdings yet</h2>
          <p>Once you invest, your funds appear here.</p>
          <button className="be-btn be-btn-primary apk-empty-cta" onClick={() => navigate('/app/explore')}>Explore funds</button>
        </div>
      ) : (
        <div className="apk-holdings-list">
          {holdings.map((h) => (
            <button
              key={h.fundId}
              type="button"
              className="be-card apk-holding apk-holding-card"
              onClick={() => navigate(`/app/funds/${h.fundId}`)}
              aria-label={`Open ${h.fundName}`}
            >
              <div className="apk-holding-head">
                <div className="apk-holding-title">
                  <div className="apk-fund-name" title={h.fundName}>{h.fundName}</div>
                  <div className="apk-cell-meta">{fmtUnits(h.units)} units</div>
                </div>
                <div className="apk-holding-side">
                  <span className={'be-badge ' + holdingBadgeClass(h.status)}>
                    <span className="be-badge-dot" />{holdingBadgeLabel(h.status)}
                  </span>
                </div>
              </div>
              <dl className="apk-metric-grid apk-metric-grid-2 apk-holding-metrics">
                <div className="apk-metric">
                  <dt className="apk-portfolio-mini-l">Invested</dt>
                  <dd className="apk-portfolio-mini-v be-money"><MoneyValue amount={h.invested} source="derived" asOf={h.asOf || portfolio.asOf} showBadge={false} /></dd>
                </div>
                <div className="apk-metric">
                  <dt className="apk-portfolio-mini-l">Units</dt>
                  <dd className="apk-portfolio-mini-v be-num">{fmtUnits(h.units)}</dd>
                </div>
              </dl>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button
                  className="be-btn be-btn-secondary be-btn-sm"
                  style={{ flex: 1 }}
                  onClick={(e) => { e.stopPropagation(); setRedeemModal(h); setRedeemAmount(''); setRedeemType('partial'); setRedeemMessage(null); setRedeemStep('form'); setRedeemPreview(null); }}
                >
                  <Wallet size={14} /> Redeem
                </button>
              </div>
            </button>
          ))}
        </div>
      )}
      {portfolio && (
        <p className="be-disclosure apk-portfolio-disclosure">
          Holdings as of {fmtDate(portfolio.asOf, { withTime: true })}. Published by BeOnEdge.
        </p>
      )}

      {/* Redemption Modal */}
      {redeemModal && (
        <div className="apk-sheet-overlay" role="presentation" onMouseDown={() => !redeemSubmitting && resetRedeemModal()}>
          <section className="apk-sheet" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
            <div className="apk-sheet-head">
              <h2>{redeemStep === 'preview' ? 'Redemption Preview' : `Redeem from ${redeemModal.fundName}`}</h2>
              <button className="apk-sheet-close" onClick={() => resetRedeemModal()} aria-label="Close" disabled={redeemSubmitting}>×</button>
            </div>
            {redeemStep === 'form' && (
              <form onSubmit={handleRedeemSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {redeemMessage && (
                  <div style={{ padding: 10, borderRadius: 6, fontSize: 13, background: redeemMessage.type === 'success' ? 'var(--be-green-soft)' : 'var(--be-red-soft)', color: redeemMessage.type === 'success' ? 'var(--be-green)' : 'var(--be-red)' }}>
                    {redeemMessage.text}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                  <div><div className="be-eyebrow">Current Value</div><div className="be-money" style={{ fontSize: 18 }}>{fmtMoney(redeemModal.currentValue)}</div></div>
                  <div><div className="be-eyebrow">Units</div><div className="be-num" style={{ fontSize: 18 }}>{fmtUnits(redeemModal.units)}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className={`be-btn be-btn-sm ${redeemType === 'partial' ? 'be-btn-primary' : 'be-btn-secondary'}`} style={{ flex: 1 }} onClick={() => setRedeemType('partial')}>
                    Partial
                  </button>
                  <button type="button" className={`be-btn be-btn-sm ${redeemType === 'full' ? 'be-btn-primary' : 'be-btn-secondary'}`} style={{ flex: 1 }} onClick={() => setRedeemType('full')}>
                    Full Amount
                  </button>
                </div>
                {redeemType === 'partial' && (
                  <label className="be-field">
                    <span>Amount to redeem (₹)</span>
                    <input
                      className="be-input be-num"
                      type="number"
                      min="1"
                      max={redeemModal.currentValue}
                      value={redeemAmount}
                      onChange={e => setRedeemAmount(e.target.value)}
                      placeholder="Enter amount"
                      required
                    />
                  </label>
                )}
                {redeemType === 'full' && (
                  <div style={{ padding: 12, background: 'var(--be-bone)', borderRadius: 6, textAlign: 'center' }}>
                    <div className="be-eyebrow">You will redeem</div>
                    <div className="be-money" style={{ fontSize: 24 }}>{fmtMoney(redeemModal.currentValue)}</div>
                  </div>
                )}
                <div className="be-disclosure" style={{ fontSize: 11 }}>
                  Redemption requests require admin approval. Funds will be returned to your registered account within 2-3 business days after approval.
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="be-btn be-btn-secondary" style={{ flex: 1 }} onClick={() => resetRedeemModal()} disabled={redeemSubmitting}>Cancel</button>
                  <button type="submit" className="be-btn be-btn-primary" style={{ flex: 1 }} disabled={redeemSubmitting}>
                    {redeemSubmitting ? 'Loading...' : 'Preview Redemption'}
                  </button>
                </div>
              </form>
            )}
            {redeemStep === 'preview' && redeemPreview && (
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '70vh', overflowY: 'auto' }}>
                {redeemMessage && (
                  <div style={{ padding: 10, borderRadius: 6, fontSize: 13, background: redeemMessage.type === 'success' ? 'var(--be-green-soft)' : 'var(--be-red-soft)', color: redeemMessage.type === 'success' ? 'var(--be-green)' : 'var(--be-red)' }}>
                    {redeemMessage.text}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                  <div><div className="be-eyebrow">Units to redeem</div><div className="be-num" style={{ fontSize: 16 }}>{fmtUnits(redeemPreview.units)}</div></div>
                  <div><div className="be-eyebrow">Gross amount</div><div className="be-money" style={{ fontSize: 16 }}>{fmtMoney(redeemPreview.grossAmount)}</div></div>
                </div>

                <div style={{ background: 'var(--be-bone)', borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span>Gross amount</span>
                    <span className="be-money">{fmtMoney(redeemPreview.grossAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--be-slate)' }}>Exit load ({(redeemPreview.exitLoadRate * 100).toFixed(2)}%)</span>
                    <span className="be-money" style={{ color: 'var(--be-slate)' }}>−{fmtMoney(redeemPreview.exitLoadAmount)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--be-slate-2)' }}>{redeemPreview.exitLoadFormula}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--be-slate)' }}>STT ({(redeemPreview.sttRate * 100).toFixed(3)}%)</span>
                    <span className="be-money" style={{ color: 'var(--be-slate)' }}>−{fmtMoney(redeemPreview.sttAmount)}</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--be-border)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--be-slate)' }}>Gain ({redeemPreview.gainType})</span>
                    <span className="be-num" style={{ color: 'var(--be-slate)' }}>{fmtMoney(redeemPreview.gainAmount)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--be-slate-2)' }}>Holding period: {redeemPreview.holdingPeriodMonths} months</div>
                  {redeemPreview.gainType === 'LTCG' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--be-slate)' }}>Exemption applied</span>
                        <span className="be-money" style={{ color: 'var(--be-green)' }}>−{fmtMoney(redeemPreview.ltcgExemptionUsed)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--be-slate)' }}>Taxable gain</span>
                        <span className="be-money" style={{ color: 'var(--be-slate)' }}>{fmtMoney(redeemPreview.gainAmount - redeemPreview.ltcgExemptionUsed)}</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--be-slate)' }}>Tax ({(redeemPreview.taxRate * 100).toFixed(1)}%)</span>
                    <span className="be-money" style={{ color: 'var(--be-slate)' }}>−{fmtMoney(redeemPreview.taxAmount)}</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--be-border)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 600 }}>
                    <span>Net proceeds</span>
                    <span className="be-money">{fmtMoney(redeemPreview.netProceeds)}</span>
                  </div>
                </div>

                <div style={{ background: 'var(--be-bone)', borderRadius: 6, padding: 12 }}>
                  <div className="be-eyebrow" style={{ marginBottom: 8 }}>Assumptions</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: 'var(--be-slate-2)' }}>
                    <div>STCG rate: {(redeemPreview.assumptions.stcgRate * 100).toFixed(1)}%</div>
                    <div>LTCG rate: {(redeemPreview.assumptions.ltcgRate * 100).toFixed(1)}%</div>
                    <div>LTCG exemption: ₹{fmtNum(redeemPreview.assumptions.ltcgExemptionLimit)}</div>
                    <div>STT rate: {(redeemPreview.assumptions.sttRate * 100).toFixed(3)}%</div>
                    <div>Holding cutoff: {redeemPreview.assumptions.holdingPeriodCutoffMonths} months</div>
                    <div>Calculated: {fmtDate(redeemPreview.assumptions.calculationDate, { withTime: true })}</div>
                  </div>
                </div>

                <div className="be-disclosure" style={{ fontSize: 11 }}>
                  Redemption requests require admin approval. Funds will be returned to your registered account within 2-3 business days after approval.
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="be-btn be-btn-secondary" style={{ flex: 1 }} onClick={() => setRedeemStep('form')} disabled={redeemSubmitting}>Back</button>
                  <button type="button" className="be-btn be-btn-primary" style={{ flex: 1 }} onClick={handleConfirmRedemption} disabled={redeemSubmitting}>
                    {redeemSubmitting ? 'Submitting...' : 'Confirm & Request'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

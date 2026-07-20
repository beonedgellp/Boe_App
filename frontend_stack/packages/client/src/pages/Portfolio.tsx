import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, RotateCcw, Wallet } from 'lucide-react';
import * as portfolioApi from '../services/portfolioApi';
import * as fundsApi from '../services/fundsApi';
import { fmtMoney, fmtNum, fmtPct, fmtUnits, fmtDate } from '../utils/format';
import MoneyValue from '@beonedge/shared/components/MoneyValue';
import { EmptyState } from '@beonedge/shared';

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
        <div className="apk-portfolio-header-actions">
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
            <div className="apk-skel apk-summary-skel-title" />
            <div className="apk-skel apk-summary-skel-value" />
            <div className="apk-portfolio-summary-grid-skeleton">
              {[1,2].map(i => <div key={i} className="apk-skel apk-summary-skel-tile" />)}
            </div>
          </div>
          <div className="apk-holdings-list-skeleton">
            {[1,2].map(i => (
              <div key={i} className="be-card apk-holding-skeleton">
                <div className="apk-skel apk-holding-skel-name" />
                <div className="apk-skel apk-holding-skel-meta" />
                <div className="apk-holding-metrics-skeleton">
                  {[1,2].map(j => <div key={j} className="apk-skel apk-holding-skel-metric" />)}
                </div>
                <div className="apk-skel apk-holding-skel-action" />
              </div>
            ))}
          </div>
        </>
      ) : (
        <section className="be-card apk-portfolio apk-portfolio-summary" aria-label="Portfolio summary">
          <div className="apk-portfolio-hero">
            <span className="be-eyebrow apk-portfolio-eye">Your investments</span>
            <div className="apk-portfolio-num be-money"><MoneyValue amount={portfolio.invested} source={portfolio.source} asOf={portfolio.asOf} showBadge={false} /></div>
            <div className="apk-portfolio-hero-label">
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
        <EmptyState
          className="be-card apk-portfolio-empty"
          icon={<PieChart size={36} strokeWidth={1.5} />}
          title="No holdings yet"
          description="Once you invest, your funds appear here."
          action={
            <button className="be-btn be-btn-primary apk-empty-cta" onClick={() => navigate('/app/explore')}>
              Explore funds
            </button>
          }
        />
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
              <div className="apk-holding-actions">
                <button
                  className="be-btn be-btn-secondary be-btn-sm apk-holding-action-btn"
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
          Holdings as of {fmtDate(portfolio.asOf, { withTime: true })}. Investment values are subject to market risk. Published by BeOnEdge.
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
              <form onSubmit={handleRedeemSubmit} className="apk-sheet-form">
                {redeemMessage && (
                  <div className={`apk-sheet-message apk-sheet-message--${redeemMessage.type}`}>
                    {redeemMessage.text}
                  </div>
                )}
                <div className="apk-sheet-grid-2">
                  <div><div className="be-eyebrow">Current Value</div><div className="be-money apk-sheet-value-lg">{fmtMoney(redeemModal.currentValue)}</div></div>
                  <div><div className="be-eyebrow">Units</div><div className="be-num apk-sheet-value-lg">{fmtUnits(redeemModal.units)}</div></div>
                </div>
                <div className="apk-sheet-actions apk-sheet-actions--inline">
                  <button type="button" className={`be-btn be-btn-sm apk-sheet-btn ${redeemType === 'partial' ? 'be-btn-primary' : 'be-btn-secondary'}`} onClick={() => setRedeemType('partial')}>
                    Partial
                  </button>
                  <button type="button" className={`be-btn be-btn-sm apk-sheet-btn ${redeemType === 'full' ? 'be-btn-primary' : 'be-btn-secondary'}`} onClick={() => setRedeemType('full')}>
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
                  <div className="apk-sheet-well apk-sheet-well--center">
                    <div className="be-eyebrow">You will redeem</div>
                    <div className="be-money apk-sheet-value-xl">{fmtMoney(redeemModal.currentValue)}</div>
                  </div>
                )}
                <div className="be-disclosure apk-sheet-disclosure">
                  Redemption requests require admin approval. Funds will be returned to your registered account within 2-3 business days after approval.
                </div>
                <div className="apk-sheet-actions apk-sheet-actions--inline">
                  <button type="button" className="be-btn be-btn-secondary apk-sheet-btn" onClick={() => resetRedeemModal()} disabled={redeemSubmitting}>Cancel</button>
                  <button type="submit" className="be-btn be-btn-primary apk-sheet-btn" disabled={redeemSubmitting}>
                    {redeemSubmitting ? 'Loading...' : 'Preview Redemption'}
                  </button>
                </div>
              </form>
            )}
            {redeemStep === 'preview' && redeemPreview && (
              <div className="apk-sheet-body">
                {redeemMessage && (
                  <div className={`apk-sheet-message apk-sheet-message--${redeemMessage.type}`}>
                    {redeemMessage.text}
                  </div>
                )}
                <div className="apk-sheet-grid-2">
                  <div><div className="be-eyebrow">Units to redeem</div><div className="be-num apk-sheet-value-md">{fmtUnits(redeemPreview.units)}</div></div>
                  <div><div className="be-eyebrow">Gross amount</div><div className="be-money apk-sheet-value-md">{fmtMoney(redeemPreview.grossAmount)}</div></div>
                </div>

                <div className="apk-sheet-well apk-sheet-well--col">
                  <div className="apk-sheet-row apk-sheet-row--emphasis">
                    <span>Gross amount</span>
                    <span className="be-money">{fmtMoney(redeemPreview.grossAmount)}</span>
                  </div>
                  <div className="apk-sheet-row">
                    <span className="apk-sheet-label">Exit load ({(redeemPreview.exitLoadRate * 100).toFixed(2)}%)</span>
                    <span className="be-money apk-sheet-value--muted">−{fmtMoney(redeemPreview.exitLoadAmount)}</span>
                  </div>
                  <div className="apk-sheet-caption">{redeemPreview.exitLoadFormula}</div>
                  <div className="apk-sheet-row">
                    <span className="apk-sheet-label">STT ({(redeemPreview.sttRate * 100).toFixed(3)}%)</span>
                    <span className="be-money apk-sheet-value--muted">−{fmtMoney(redeemPreview.sttAmount)}</span>
                  </div>
                  <div className="apk-sheet-divider" />
                  <div className="apk-sheet-row">
                    <span className="apk-sheet-label">Gain ({redeemPreview.gainType})</span>
                    <span className="be-num apk-sheet-value--muted">{fmtMoney(redeemPreview.gainAmount)}</span>
                  </div>
                  <div className="apk-sheet-caption">Holding period: {redeemPreview.holdingPeriodMonths} months</div>
                  {redeemPreview.gainType === 'LTCG' && (
                    <>
                      <div className="apk-sheet-row">
                        <span className="apk-sheet-label">Exemption applied</span>
                        <span className="be-money apk-sheet-value--gain">−{fmtMoney(redeemPreview.ltcgExemptionUsed)}</span>
                      </div>
                      <div className="apk-sheet-row">
                        <span className="apk-sheet-label">Taxable gain</span>
                        <span className="be-money apk-sheet-value--muted">{fmtMoney(redeemPreview.gainAmount - redeemPreview.ltcgExemptionUsed)}</span>
                      </div>
                    </>
                  )}
                  <div className="apk-sheet-row">
                    <span className="apk-sheet-label">Tax ({(redeemPreview.taxRate * 100).toFixed(1)}%)</span>
                    <span className="be-money apk-sheet-value--muted">−{fmtMoney(redeemPreview.taxAmount)}</span>
                  </div>
                  <div className="apk-sheet-divider" />
                  <div className="apk-sheet-row apk-sheet-row--total">
                    <span>Net proceeds</span>
                    <span className="be-money">{fmtMoney(redeemPreview.netProceeds)}</span>
                  </div>
                </div>

                <div className="apk-sheet-well">
                  <div className="be-eyebrow">Assumptions</div>
                  <div className="apk-sheet-assumptions">
                    <div>STCG rate: {(redeemPreview.assumptions.stcgRate * 100).toFixed(1)}%</div>
                    <div>LTCG rate: {(redeemPreview.assumptions.ltcgRate * 100).toFixed(1)}%</div>
                    <div>LTCG exemption: ₹{fmtNum(redeemPreview.assumptions.ltcgExemptionLimit)}</div>
                    <div>STT rate: {(redeemPreview.assumptions.sttRate * 100).toFixed(3)}%</div>
                    <div>Holding cutoff: {redeemPreview.assumptions.holdingPeriodCutoffMonths} months</div>
                    <div>Calculated: {fmtDate(redeemPreview.assumptions.calculationDate, { withTime: true })}</div>
                  </div>
                </div>

                <div className="be-disclosure apk-sheet-disclosure">
                  Redemption requests require admin approval. Funds will be returned to your registered account within 2-3 business days after approval.
                </div>
                <div className="apk-sheet-actions apk-sheet-actions--inline">
                  <button type="button" className="be-btn be-btn-secondary apk-sheet-btn" onClick={() => setRedeemStep('form')} disabled={redeemSubmitting}>Back</button>
                  <button type="button" className="be-btn be-btn-primary apk-sheet-btn" onClick={handleConfirmRedemption} disabled={redeemSubmitting}>
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

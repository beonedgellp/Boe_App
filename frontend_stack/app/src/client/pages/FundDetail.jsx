import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Share2, ArrowLeft, Wallet, Activity,
  Calendar, Shield, Bell,
  Briefcase, CheckCircle, AlertTriangle, FileText, MessageSquare,
} from 'lucide-react';
import AppBar from '../layout/AppBar.jsx';
import * as fundsApi from '../services/fundsApi.js';
import * as disclosureApi from '../services/disclosureApi.js';
import { AllocationRing, PieChart3D } from '../components/Charts.jsx';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { isComponentEnabled } from '../../shared/appConfig.js';
import { fmtMoney, fmtNum, fmtPct } from '../utils/format.js';
import MoneyValue from '../../shared/components/MoneyValue.jsx';

const RISK_LABELS = {
  low: 'Low', low_moderate: 'Low-Moderate', moderate: 'Moderate',
  moderate_high: 'Moderate-High', high: 'High',
};

const LIFECYCLE_LABELS = {
  published: 'Preview',
  active: 'Active Fund',
  paused: 'Paused',
  closed: 'Closed',
};

function FundDetailSkeleton() {
  return (
    <div className="apk-detail-stack">
      <div className="apk-detail-main">
        <div className="apk-detail-hero">
          <div className="apk-skel" style={{ width: 120, height: 16, marginBottom: 12 }} />
          <div className="apk-skel" style={{ width: '80%', height: 36, marginBottom: 8 }} />
          <div className="apk-skel" style={{ width: '60%', height: 14 }} />
        </div>
        <div className="be-card apk-skel" style={{ height: 120 }} />
        <div className="be-card apk-skel" style={{ height: 340 }} />
        <div className="be-card apk-skel" style={{ height: 240 }} />
        <div className="be-card apk-skel" style={{ height: 180 }} />
      </div>
      <div className="apk-detail-side">
        <div className="be-card apk-skel" style={{ height: 300 }} />
        <div className="be-card apk-skel" style={{ height: 140 }} />
        <div className="be-card apk-skel" style={{ height: 280 }} />
      </div>
    </div>
  );
}


export default function FundDetail() {
  const { fundId } = useParams();
  const navigate = useNavigate();
  const appConfig = useAppConfig();
  const screen = appConfig.mobile.screens.fundDetail;
  const copy = screen.copy;
  const [fund, setFund] = useState(null);
  const [disclosures, setDisclosures] = useState(null);
  const [sipAmount, setSipAmount] = useState(screen.calculator.defaultAmount ?? '');
  const [sipMonths, setSipMonths] = useState(screen.calculator.defaultMonths ?? '');

  useEffect(() => {
    let cancelled = false;
    fundsApi.getFund(fundId).then((data) => {
      if (!cancelled) setFund(data);
    }).catch((error) => {
      if (!cancelled) {
        // silently fail
        setFund(null);
      }
    });
    return () => { cancelled = true; };
  }, [fundId, appConfig.publishedAt]);

  useEffect(() => {
    let cancelled = false;
    disclosureApi.getDisclosures().then((data) => {
      if (!cancelled) setDisclosures(data);
    }).catch((error) => {
      if (!cancelled) {
        // silently fail
        setDisclosures(null);
      }
    });
    return () => { cancelled = true; };
  }, [appConfig.publishedAt]);
  const projectedInvested = useMemo(() => {
    const n = Number(sipMonths) || 0;
    const amount = Number(sipAmount) || 0;
    return amount * n;
  }, [sipAmount, sipMonths]);

  function onShare() {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: fund?.name, url }).catch(() => {});
    else navigator.clipboard?.writeText(url);
  }

  if (!fund) {
    return (
      <>
        <AppBar title="" />
        <div className="apk-screen apk-fund-detail">
          <FundDetailSkeleton />
        </div>
      </>
    );
  }

  const isActive = fund.status === 'active';
  const analytics = fund.analytics || {};
  const chartConfig = fund.chartConfig || {};
  const sectors = fund.sectors || [];
  const investments = fund.investments || [];
  const largestSector = sectors.reduce((max, s) => (s.percentage > (max?.percentage || 0) ? s : max), null);

  const lifecycleLabel = LIFECYCLE_LABELS[fund.lifecycleStage] || LIFECYCLE_LABELS.published;
  const heroBg = largestSector?.color ? `${largestSector.color}0D` : 'transparent'; // ~5% opacity hex



  return (
    <>
      <AppBar title={fund.name} rightIcon={Share2} onRight={onShare} rightAriaLabel="Share" />
      <div className="apk-screen apk-fund-detail">
        {/* Hero */}
        <div className="apk-detail-hero" style={{ background: `linear-gradient(135deg, ${heroBg} 0%, transparent 70%)` }}>
          <button className="apk-back-link" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} strokeWidth={1.5} />
            <span>Back to funds</span>
          </button>
          <div className="apk-detail-hero-top">
            <div className="apk-detail-hero-text">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <div className="be-eyebrow">{fund.categoryEyebrow}</div>
                <span className="apk-lifecycle-badge">{lifecycleLabel}</span>

              </div>
              <h1 className="apk-h apk-detail-hero-title">{fund.name}</h1>
              <p className="apk-detail-hero-tagline">{fund.tagline}</p>
              <div className="apk-detail-hero-trust">
                <span className="apk-trust-badge"><CheckCircle size={12} strokeWidth={2} /> SEBI Registered</span>
                <span className="apk-trust-sep">·</span>
                <span className="apk-trust-badge"><CheckCircle size={12} strokeWidth={2} /> Disclosure Compliant</span>
                <span className="apk-trust-sep">·</span>
                <span className="apk-trust-badge"><CheckCircle size={12} strokeWidth={2} /> Audited Holdings</span>
              </div>
              <p className="apk-detail-hero-quote">Past performance is not indicative of future returns</p>
            </div>
            <div className="apk-detail-status">
              {isActive ? (
                <span className="be-badge be-badge-active">
                  <span className="be-badge-dot" />
                  Active
                </span>
              ) : (
                <span className="be-badge be-badge-gold">
                  <span className="be-badge-dot" />
                  Coming Soon
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="apk-detail-stack">
          <div className="apk-detail-main">
            {/* Objective */}
            {isComponentEnabled(appConfig, 'fundDetail', 'objective') && (
              <div className="be-card apk-fund-obj">
                <div className="be-eyebrow">{copy.objectiveTitle}</div>
                <p>{fund.objective}</p>
                <div className="apk-fund-obj-meta">
                  <div><strong>{copy.riskLabel}</strong>{RISK_LABELS[fund.riskLabel]}</div>
                  <div><strong>{copy.horizonLabel}</strong>{fund.horizon}</div>
                </div>
              </div>
            )}

            {/* Key Stats */}
            {isComponentEnabled(appConfig, 'fundDetail', 'key_stats') && (
              <div className="be-card apk-key-stats">
                <div className="be-eyebrow">{copy.keyStatsTitle || 'Key Metrics'}</div>
                <div className="apk-key-stats-grid">
                  <div className="apk-stat-card">
                    <div className="apk-stat-card-icon" style={{ background: 'rgba(31, 122, 77, 0.10)', color: 'var(--be-green)' }}>
                      <Briefcase size={18} strokeWidth={2} />
                    </div>
                    <div className="apk-stat-card-label">Pool Size</div>
                    <div className="apk-stat-card-value be-money"><MoneyValue amount={fund.totalPoolSize} source={fund.source || 'mock'} asOf={new Date().toISOString()} /></div>
                  </div>
                  <div className="apk-stat-card">
                    <div className="apk-stat-card-icon" style={{ background: 'rgba(181, 137, 74, 0.12)', color: 'var(--be-gold)' }}>
                      <Calendar size={18} strokeWidth={2} />
                    </div>
                    <div className="apk-stat-card-label">Min SIP</div>
                    <div className="apk-stat-card-value be-money"><MoneyValue amount={fund.minSip} source={fund.source || 'mock'} asOf={new Date().toISOString()} showBadge={false} /></div>
                  </div>
                  <div className="apk-stat-card">
                    <div className="apk-stat-card-icon" style={{ background: 'rgba(180, 58, 46, 0.10)', color: 'var(--be-red)' }}>
                      <Shield size={18} strokeWidth={2} />
                    </div>
                    <div className="apk-stat-card-label">Risk Level</div>
                    <div className="apk-stat-card-value">{RISK_LABELS[fund.riskLabel]}</div>
                  </div>
                  {analytics.fundAge && (
                    <div className="apk-stat-card">
                      <div className="apk-stat-card-icon" style={{ background: 'var(--be-gold-soft)', color: 'var(--be-gold)' }}>
                        <Calendar size={18} strokeWidth={2} />
                      </div>
                      <div className="apk-stat-card-label">Fund Age</div>
                      <div className="apk-stat-card-value be-num">{analytics.fundAge.display}</div>
                    </div>
                  )}
                </div>
                <div className="apk-key-stats-divider" />
                <div className="apk-key-stats-row">
                  <span>Horizon</span>
                  <span>{fund.horizon}</span>
                </div>
                <div className="apk-key-stats-row">
                  <span>Risk</span>
                  <span className="be-badge be-badge-neutral" style={{ fontSize: 11, padding: '4px 10px' }}>{RISK_LABELS[fund.riskLabel]}</span>
                </div>
              </div>
            )}



            {/* Sector Distribution */}
            {isComponentEnabled(appConfig, 'fundDetail', 'allocation_chart') && chartConfig.showSectorDistribution !== false && sectors.length > 0 && (
              <div className="be-card apk-alloc apk-sector-chart-3d">
                <div className="apk-sector-chart-wrap">
                  <PieChart3D
                    data={sectors.map((s) => ({ label: s.name, percentage: s.percentage, color: s.color }))}
                    size={180}
                    depth={18}
                  />
                </div>
                <div className="apk-sector-legend">
                  <div className="be-eyebrow" style={{ marginBottom: 8 }}>Sector Allocation</div>
                  {sectors.map((s) => (
                    <div key={s.id} className="apk-sector-legend-item">
                      <span className="apk-sector-color" style={{ background: s.color }} />
                      <span>{s.name}</span>
                      <span className="be-num">{s.percentage}%</span>
                    </div>
                  ))}
                  {largestSector && (
                    <div className="apk-concentration-note">Largest concentration: {largestSector.name}</div>
                  )}
                </div>
              </div>
            )}

            {/* Investment Breakdown */}
            {isComponentEnabled(appConfig, 'fundDetail', 'portfolio_exposure') && chartConfig.showInvestmentBreakdown !== false && investments.length > 0 && (
              <div className="be-card apk-investment-breakdown">
                <div className="be-eyebrow">{copy.exposureTitle || 'Investment Breakdown'}</div>
                {sectors.map((sector) => {
                  const sectorInvestments = investments.filter((inv) => inv.sectorId === sector.id);
                  if (sectorInvestments.length === 0) return null;
                  return (
                    <div key={sector.id} className="apk-investment-sector">
                      <div className="apk-investment-sector-header">
                        <span className="apk-sector-color" style={{ background: sector.color }} />
                        <strong>{sector.name}</strong>
                        <span className="be-num">({sector.percentage}%)</span>
                      </div>
                      <div className="apk-investment-list">
                        {sectorInvestments.map((inv, idx) => (
                          <div key={inv.id || idx} className="apk-investment-item">
                            <span className="apk-investment-item-name">
                              {chartConfig.showCompanyNames !== false ? inv.companyName : `Company ${idx + 1}`}
                            </span>
                            <div className="apk-investment-item-right">
                              <div className="apk-investment-progress">
                                <div className="apk-investment-progress-track">
                                  <div
                                    className="apk-investment-progress-fill"
                                    style={{
                                      width: `${Math.min(100, ((inv.percentage ?? 0) / (sector.percentage || 1)) * 100)}%`,
                                      background: sector.color,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="be-num apk-investment-item-pct">{fmtPct((inv.percentage ?? 0) / 100, { sign: false, decimals: 1 })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Portfolio exposure */}
            {isActive && isComponentEnabled(appConfig, 'fundDetail', 'portfolio_exposure') && fund.topHoldings?.length > 0 && (
              <div className="be-card apk-holding">
                <div className="be-eyebrow">{copy.exposureTitle}</div>
                {fund.topHoldings.slice(0, screen.exposureLimit).map((h) => (
                  <div key={h.symbol} className="apk-holding-row">
                    <div>
                      <div className="apk-holding-name">{h.name}</div>
                    </div>
                    <div className="apk-holding-pct be-num">{fmtPct((h.pct ?? 0) / 100, { sign: false, decimals: 1 })}</div>
                  </div>
                ))}
                <a className="apk-link apk-inline-link">{copy.exposureLinkLabel}</a>
              </div>
            )}

            {/* Fees */}
            {isActive && isComponentEnabled(appConfig, 'fundDetail', 'fees') && fund.fees?.length > 0 && (
              <div className="be-card apk-fund-fees">
                <div className="be-eyebrow">{copy.feesTitle}</div>
                {fund.fees.map((f) => (
                  <div key={f.label} className="apk-fund-fees-row"><span>{f.label}</span><span>{f.value}</span></div>
                ))}
                <div className="be-disclosure apk-card-note">{copy.feesDisclosure}</div>
              </div>
            )}

            {/* SEBI / AMFI Disclosure Block */}
            {disclosures && (
              <div className="be-card apk-disclosure-block">
                <div className="be-eyebrow">Regulatory Disclosures</div>

                {/* Risk-o-meter */}
                <div className="apk-riskometer">
                  <div className="apk-riskometer-label">
                    <span className="apk-riskometer-badge" style={{ background: disclosures.riskometer?.color ? `${disclosures.riskometer.color}18` : 'var(--be-ivory-2)', color: disclosures.riskometer?.color || 'var(--be-slate)' }}>
                      <AlertTriangle size={12} strokeWidth={2} />
                      {disclosures.riskometer?.label || disclosures.riskometer?.level}
                    </span>
                    <span className="apk-riskometer-level">Risk-o-meter</span>
                  </div>
                  <div className="apk-riskometer-bar">
                    {['low', 'moderate', 'high', 'very_high'].map((lvl) => (
                      <div
                        key={lvl}
                        className={`apk-riskometer-segment ${disclosures.riskometer?.level === lvl ? 'is-active' : ''}`}
                        style={{
                          background: disclosures.riskometer?.level === lvl
                            ? (disclosures.riskometer?.color || 'var(--be-slate)')
                            : 'var(--be-border)',
                        }}
                      />
                    ))}
                  </div>
                  <p className="apk-riskometer-desc">{disclosures.riskometer?.description}</p>
                </div>

                {/* Key disclosure rows */}
                <div className="apk-disclosure-rows">
                  <div className="apk-disclosure-row">
                    <span className="apk-disclosure-row-label">Scheme Category</span>
                    <span className="apk-disclosure-row-value">{disclosures.schemeCategory}</span>
                  </div>
                  <div className="apk-disclosure-row">
                    <span className="apk-disclosure-row-label">Expense Ratio</span>
                    <span className="apk-disclosure-row-value">{disclosures.expenseRatio}</span>
                  </div>
                  <div className="apk-disclosure-row">
                    <span className="apk-disclosure-row-label">Exit Load</span>
                    <span className="apk-disclosure-row-value">{disclosures.exitLoad}</span>
                  </div>
                </div>

                {/* SEBI mandated text */}
                <div className="apk-sebi-text">
                  <AlertTriangle size={14} strokeWidth={2} />
                  <span>{disclosures.sebiDisclosure}</span>
                </div>

                {/* Links */}
                <div className="apk-disclosure-links">
                  <Link className="apk-disclosure-link" to={disclosures.investorCharterUrl}>
                    <FileText size={14} strokeWidth={2} />
                    Investor Charter
                  </Link>
                  <Link className="apk-disclosure-link" to={disclosures.grievanceUrl}>
                    <MessageSquare size={14} strokeWidth={2} />
                    Grievance Redressal
                  </Link>
                </div>
              </div>
            )}

            {/* Investment Flow CTA */}
            <div className="be-card apk-invest-cta-card">
              {isActive ? (
                <>
                  <div className="apk-invest-cta-icon">
                    <Wallet size={28} strokeWidth={1.5} />
                  </div>
                  <h3>Ready to invest?</h3>
                  <p>Start building your portfolio with this fund today.</p>
                  <div className="apk-invest-cta-actions">
                    <button className="be-btn be-btn-primary be-btn-lg apk-invest-cta-btn" onClick={() => navigate(`/app/invest/sip/${fund.id}`)}>
                      Start SIP
                    </button>
                    <button className="be-btn be-btn-secondary be-btn-lg apk-invest-cta-btn" onClick={() => navigate(`/app/invest/lumpsum/${fund.id}`)}>
                      One-time Investment
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="apk-invest-cta-icon" style={{ background: 'var(--be-ivory-2)', color: 'var(--be-slate)' }}>
                    <Bell size={28} strokeWidth={1.5} />
                  </div>
                  <h3>Coming Soon</h3>
                  <p>This fund is not currently accepting investments. You&apos;ll be notified when it opens.</p>
                  <button className="be-btn be-btn-primary be-btn-lg apk-invest-cta-btn" style={{ maxWidth: 260 }}>
                    <Bell size={16} strokeWidth={2} /> Notify me
                  </button>
                </>
              )}
            </div>

            {/* Methodology disclosure */}
            {isComponentEnabled(appConfig, 'fundDetail', 'methodology_disclosure') && (
              <div className="be-disclosure">{copy.methodologyPrefix} · {fund.methodology} Disclosure {fund.disclosureVersion}. Past performance does not guarantee future returns.</div>
            )}

            {/* Bottom Disclaimer */}
            <div className="apk-fund-disclaimer-card">
              <div className="apk-disclaimer-icon">ⓘ</div>
              <p><strong>Important Disclaimer:</strong> Past performance is not indicative of future returns. All investments are subject to market risks. Please read all scheme-related documents carefully before investing.</p>
            </div>
          </div>

          <div className="apk-detail-side">
            {/* Minimums */}
            {isComponentEnabled(appConfig, 'fundDetail', 'minimums') && (
              <div className="apk-fund-mins">
                <div><div className="apk-fund-mins-l">{copy.minSipLabel}</div><div className="apk-fund-mins-v be-money"><MoneyValue amount={fund.minSip} source={fund.source || 'mock'} asOf={new Date().toISOString()} showBadge={false} /></div></div>
                <div><div className="apk-fund-mins-l">{copy.minLumpsumLabel}</div><div className="apk-fund-mins-v be-money"><MoneyValue amount={fund.minLumpsum} source={fund.source || 'mock'} asOf={new Date().toISOString()} showBadge={false} /></div></div>
                <div><div className="apk-fund-mins-l">{copy.lockInLabel}</div><div className="apk-fund-mins-v">{fund.lockInText}</div></div>
              </div>
            )}

            {/* Calculator */}
            {isActive && isComponentEnabled(appConfig, 'fundDetail', 'sip_projection') && (
              <div className="be-card apk-fund-calc">
                <div className="be-eyebrow">{copy.projectionTitle}</div>
                <div className="be-field">
                  <label>Monthly SIP amount</label>
                  <div className="apk-amount-row">
                    <span className="apk-amount-symbol">₹</span>
                    <input className="be-input be-num" type="number" min={fund.minSip ?? 0} value={sipAmount ?? ''} onChange={(e) => setSipAmount(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                  <div className="apk-chip-row apk-field-chips">
                    {screen.calculator.amountPresets.map((v) => (
                      <button key={v} className={'apk-chip' + (sipAmount === v ? ' is-active' : '')} onClick={() => setSipAmount(v)}>{fmtMoney(v)}</button>
                    ))}
                  </div>
                </div>
                <div className="be-field">
                  <label>Duration</label>
                  <div className="apk-chip-row">
                    {screen.calculator.durationMonths.map((m) => (
                      <button key={m} className={'apk-chip' + (sipMonths === m ? ' is-active' : '')} onClick={() => setSipMonths(m)}>{m} mo</button>
                    ))}
                  </div>
                </div>
                {projectedInvested > 0 && (
                  <div className="apk-fund-calc-out">
                    <div className="apk-fund-calc-out-l">Total invested at end of {sipMonths || 'configured'} months</div>
                    <div className="apk-fund-calc-out-v be-money"><MoneyValue amount={projectedInvested} source="derived" asOf={new Date().toISOString()} showBadge={false} /></div>
                  </div>
                )}
                <div className="be-disclosure">{copy.projectionDisclosure}</div>
              </div>
            )}
          </div>
        </div>

        {isActive && isComponentEnabled(appConfig, 'fundDetail', 'action_bar') && (
          <div className="apk-action-bar apk-fund-action">
            <button className="be-btn be-btn-secondary be-btn-lg" onClick={() => navigate(`/app/invest/lumpsum/${fund.id}`)}>{copy.oneTimeButton}</button>
            <button className="be-btn be-btn-primary be-btn-lg" onClick={() => navigate(`/app/invest/sip/${fund.id}`)}>{copy.sipButton}</button>
          </div>
        )}
        {!isActive && (
          <div className="apk-banner">{copy.closedBanner || 'This fund is coming soon.'}</div>
        )}
      </div>
    </>
  );
}

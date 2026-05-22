import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, TrendingUp, ArrowRight, SlidersHorizontal, Bell, BarChart3, Layers } from 'lucide-react';
import * as fundsApi from '../services/fundsApi.js';
import * as researchApi from '../services/researchApi.js';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { isComponentEnabled } from '@beonedge/shared/appConfig.js';
import { fmtMoney, fmtPct } from '../utils/format.js';
import { RiskBadge } from '@beonedge/shared/components/Badges.jsx';
import { SectorMiniBar } from '@beonedge/shared/components/SectorMiniBar.jsx';


const RISK_CHIP_ORDER = ['Growth', 'Balanced', 'Conservative'];

const SORT_OPTIONS = [
  { key: 'trending', label: 'Trending' },
  { key: 'aum_desc', label: 'Highest AUM' },
  { key: 'risk_asc', label: 'Lowest Risk' },
  { key: 'newest', label: 'Newest' },
];

function FundCard({ fund, onNotify }) {
  const navigate = useNavigate();
  const isActive = fund.status === 'active';

  const analytics = fund.analytics || {};
  const sectors = fund.sectors || [];

  return (
    <div
      className={`be-card apk-fund-card ${isActive ? 'apk-fund-card--active' : 'apk-fund-card--soon'}`}
      onClick={isActive ? () => navigate(`/app/funds/${fund.id}`) : undefined}
      data-clickable={isActive ? 'true' : 'false'}
      role={isActive ? 'button' : undefined}
      tabIndex={isActive ? 0 : undefined}
    >
      <div className="apk-fund-header">
        <h3>{fund.name}</h3>
        <span className={`apk-fund-status apk-fund-status--${fund.status}`}>
          {fund.status === 'active' ? 'Active' : 'Coming Soon'}
        </span>
      </div>
      <p className="apk-fund-tagline">{fund.tagline}</p>
      <div className="apk-fund-metrics">
        <span className="apk-fund-pool">{fmtMoney(fund.totalPoolSize)}</span>
        <span className="apk-fund-sectors">{sectors.length} sectors</span>

      </div>
      {sectors.length > 0 && (
        <SectorMiniBar sectors={sectors} height={6} className="apk-fund-sectors-mini" />
      )}
      <div className="apk-fund-foot">
        <div>
          <div className="apk-fund-foot-l">Risk</div>
          <div className="apk-fund-foot-v">
            <RiskBadge riskLabel={fund.riskLabel} size="sm" />
          </div>
        </div>
        <div>
          <div className="apk-fund-foot-l">Min SIP</div>
          <div className="apk-fund-foot-v be-money">{fmtMoney(fund.minSip)}</div>
        </div>
      </div>
      {isActive ? (
        <div className="apk-fund-link">
          <span className="apk-link">Explore →</span>
        </div>
      ) : (
        <div className="apk-fund-link">
          <button
            className="be-btn be-btn-primary be-btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={(e) => { e.stopPropagation(); onNotify?.(`We'll notify you when ${fund.name} opens for investment.`); }}
          >
            <Bell size={14} strokeWidth={2} /> Notify me when open
          </button>
        </div>
      )}
      <div className="apk-fund-disclaimer">Past performance is not indicative of future returns.</div>
    </div>
  );
}

function FeaturedCard({ fund }) {
  const navigate = useNavigate();
  const isActive = fund.status === 'active';
  return (
    <div className="be-card apk-featured-card" onClick={() => navigate(`/app/funds/${fund.id}`)}>
      <div className="apk-fund-header">
        <div>
          <h3>{fund.name}</h3>
          <p className="apk-fund-tagline" style={{ marginTop: 4 }}>{fund.tagline}</p>
        </div>
        <span className={`apk-fund-status apk-fund-status--${fund.status}`}>
          {fund.status === 'active' ? 'Active' : 'Coming Soon'}
        </span>
      </div>
      <div className="apk-fund-metrics">
        <span className="apk-fund-pool">{fmtMoney(fund.totalPoolSize)}</span>
        <span className="apk-fund-sectors">{(fund.sectors?.length || 0)} sectors</span>
      </div>
      <div className="apk-featured-foot">
        <RiskBadge riskLabel={fund.riskLabel} size="sm" />
        <span className="apk-featured-link">
          View Details <ArrowRight size={14} strokeWidth={2} />
        </span>
      </div>
    </div>
  );
}

export default function Explore() {
  const navigate = useNavigate();
  const appConfig = useAppConfig();
  const screen = appConfig.mobile.screens.explore;
  const copy = screen.copy;
  const [funds, setFunds] = useState(null);
  const [research, setResearch] = useState(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [sortKey, setSortKey] = useState('trending');
  const [notifyToast, setNotifyToast] = useState('');

  useEffect(() => {
    let cancelled = false;
    fundsApi.listFunds().then((data) => { if (!cancelled) setFunds(data); }).catch(() => { if (!cancelled) setFunds([]); });
    researchApi.getResearchContext().then((data) => { if (!cancelled) setResearch(data); }).catch(() => { if (!cancelled) setResearch(null); });
    return () => { cancelled = true; };
  }, [appConfig.publishedAt]);

  const filtered = useMemo(() => {
    if (!funds) return null;
    let result = funds;
    const t = q.trim().toLowerCase();
    if (t) {
      result = result.filter((f) => f.name.toLowerCase().includes(t) || f.tagline.toLowerCase().includes(t));
    }
    if (statusFilter !== 'All') {
      const map = { Active: 'active', 'Coming Soon': 'coming_soon' };
      result = result.filter((f) => f.status === map[statusFilter]);
    }
    if (riskFilter !== 'All') {
      const reverseMap = { Growth: ['high', 'moderate_high'], Balanced: ['moderate', 'low_moderate'], Conservative: ['low'] };
      result = result.filter((f) => reverseMap[riskFilter]?.includes(f.riskLabel));
    }
    // Sort
    const sorted = [...result];
    switch (sortKey) {
      case 'aum_desc':
        sorted.sort((a, b) => (b.totalPoolSize ?? 0) - (a.totalPoolSize ?? 0));
        break;

      case 'risk_asc': {
        const riskOrder = { low: 0, low_moderate: 1, moderate: 2, moderate_high: 3, high: 4 };
        sorted.sort((a, b) => (riskOrder[a.riskLabel] ?? 99) - (riskOrder[b.riskLabel] ?? 99));
        break;
      }
      case 'newest':
        sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'trending':
      default:
        // Active first, then by pool size
        sorted.sort((a, b) => {
          const aActive = a.status === 'active' ? 1 : 0;
          const bActive = b.status === 'active' ? 1 : 0;
          if (aActive !== bActive) return bActive - aActive;
          return (b.totalPoolSize ?? 0) - (a.totalPoolSize ?? 0);
        });
        break;
    }
    return sorted;
  }, [funds, q, statusFilter, riskFilter, sortKey]);

  const trending = useMemo(() => {
    if (!funds) return [];
    return funds
      .filter((f) => f.status === 'active')
      .slice()
      .sort((a, b) => (b.totalPoolSize ?? 0) - (a.totalPoolSize ?? 0))
      .slice(0, 3);
  }, [funds]);

  const stats = useMemo(() => {
    if (!funds) return null;
    const totalFunds = funds.length;
    const totalAum = funds.reduce((s, f) => s + (Number(f.totalPoolSize) || 0), 0);
    const activeFunds = funds.filter((f) => f.status === 'active').length;
    return { totalFunds, totalAum, activeFunds };
  }, [funds]);

  const skeletonCount = typeof window !== 'undefined' && window.innerWidth >= 960 ? 4 : 3;

  return (
    <div className="apk-screen">
      <h1 className="apk-h">{copy.title}</h1>

      {/* Trending Section */}
      {trending.length > 0 && (
        <div className="apk-explore-hero">
          <div className="apk-explore-hero-head">
            <TrendingUp size={16} strokeWidth={2} />
            Trending Funds
          </div>
          <div className="apk-featured-row">
            {trending.map((f) => (
              <FeaturedCard key={f.id} fund={f} />
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      {isComponentEnabled(appConfig, 'explore', 'search') && (
        <div className="apk-search">
          <Search size={20} strokeWidth={1.5} />
          <input
            className="be-input"
            placeholder={copy.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search"
          />
          {q.length > 0 && (
            <button
              className="apk-search-clear"
              onClick={() => setQ('')}
              aria-label="Clear search"
              type="button"
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      <div className="apk-filter-bar">
        <div className="apk-filter-group">
          {['All', 'Active', 'Coming Soon'].map((chip) => (
            <button
              key={chip}
              className={`apk-filter-chip ${statusFilter === chip ? 'apk-filter-chip--active' : ''}`}
              onClick={() => setStatusFilter(chip)}
              type="button"
            >
              {chip}
            </button>
          ))}
        </div>
        <div className="apk-filter-group">
          {['All', ...RISK_CHIP_ORDER].map((chip) => (
            <button
              key={chip}
              className={`apk-filter-chip ${riskFilter === chip ? 'apk-filter-chip--active' : ''}`}
              onClick={() => setRiskFilter(chip)}
              type="button"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="apk-stats-bar">
          <div className="apk-stat-tile">
            <Layers size={14} strokeWidth={2} />
            <span className="apk-stat-tile-v">{stats.totalFunds}</span>
            <span className="apk-stat-tile-l">Funds</span>
          </div>
          <div className="apk-stat-tile">
            <BarChart3 size={14} strokeWidth={2} />
            <span className="apk-stat-tile-v">{fmtMoney(stats.totalAum)}</span>
            <span className="apk-stat-tile-l">Total AUM</span>
          </div>
          <div className="apk-stat-tile">
            <TrendingUp size={14} strokeWidth={2} />
            <span className="apk-stat-tile-v">{stats.activeFunds}</span>
            <span className="apk-stat-tile-l">Active</span>
          </div>
        </div>
      )}

      {/* Sort controls */}
      {filtered && filtered.length > 1 && (
        <div className="apk-sort-bar">
          <SlidersHorizontal size={14} strokeWidth={2} />
          <span className="be-eyebrow" style={{ fontSize: 10 }}>Sort by</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`apk-sort-chip ${sortKey === opt.key ? 'apk-sort-chip--active' : ''}`}
              onClick={() => setSortKey(opt.key)}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {isComponentEnabled(appConfig, 'explore', 'product_catalog') && (
        <>
          {!filtered ? (
            <div className="apk-strategy-grid">
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <div key={i} className="be-card apk-skel apk-strategy-skel" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="be-card apk-empty apk-empty-search">
              <Search size={40} strokeWidth={1.5} />
              <p style={{ fontWeight: 500 }}>{copy.noMatches || 'No funds match your filters.'}</p>
              <button
                className="be-btn be-btn-secondary be-btn-sm"
                onClick={() => { setQ(''); setStatusFilter('All'); setRiskFilter('All'); setSortKey('trending'); }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="apk-strategy-grid">
              {filtered.map((f) => (
                <FundCard key={f.id} fund={f} onNotify={(msg) => { setNotifyToast(msg); setTimeout(() => setNotifyToast(''), 3000); }} />
              ))}
            </div>
          )}
        </>
      )}

      <hr className="be-rule" />

      {isComponentEnabled(appConfig, 'explore', 'research_context') && (research === null || research.length > 0) && (
        <>
          <div className="be-eyebrow">{copy.researchEyebrow}</div>
          <div className="be-card apk-research-card">
            {!research ? (
              <div className="apk-research-grid">
                {[0,1,2].map(i => <div key={i} className="apk-skel apk-research-skel" />)}
              </div>
            ) : (
              <div className="apk-research-grid">
                {research.map((item) => {
                  const pct = parseInt(item.value, 10);
                  const hasPct = !Number.isNaN(pct) && item.value.includes('%');
                  return (
                    <div key={item.label} className="apk-research-row">
                      <div className="apk-research-meta">
                        <div className="apk-research-label">{item.label}</div>
                        <div className="apk-research-note">{item.note}</div>
                      </div>
                      <div className="apk-research-value-wrap">
                        {hasPct && (
                          <div className="apk-research-bar-track">
                            <div
                              className="apk-research-bar-fill"
                              style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                            />
                          </div>
                        )}
                        <div className="apk-research-value be-num">{item.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {isComponentEnabled(appConfig, 'explore', 'performance_disclosure') && (
        <div className="apk-disclaimer-banner">
          <div className="apk-disclaimer-icon">ⓘ</div>
          <div className="apk-disclaimer-text">
            <strong>Important:</strong> Past performance is not indicative of future returns.
            All investments carry risk. Please read the disclosure documents carefully before investing.
          </div>
        </div>
      )}

      {isComponentEnabled(appConfig, 'explore', 'allocation_disclosure') && (
        <div className="be-disclosure">{copy.allocationDisclosure}</div>
      )}
      <div className="be-disclosure">
        Investments are subject to market risk. Please read all scheme-related documents carefully before investing.
      </div>
      {notifyToast && (
        <div className="apk-toast" role="status">{notifyToast}</div>
      )}
    </div>
  );
}

// Single source of truth for the client-facing fund view.
//
// Both the admin fund service and the shared fund catalog service re-export
// `toClientFund` / `toClientFunds` from here so the client contract can never
// drift between surfaces. Raw rupee amounts (investment amounts, totalInvested,
// initialInvestment) are intentionally stripped here and must never be re-added.

const CLIENT_VISIBLE_STAGES = new Set(['published', 'active', 'paused', 'closed']);

const PERFORMANCE_PERIOD_KEYS = new Set(['1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL']);

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isIsoDateLike(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  // Require a leading ISO calendar date (YYYY-MM-DD) before trusting Date parse.
  if (!/^\d{4}-\d{2}-\d{2}/.test(value.trim())) return false;
  const time = new Date(value).getTime();
  return !Number.isNaN(time);
}

// Colors are rendered into inline `style` on the client, so only accept a
// strict hex / rgb(a) / named-color allowlist to remove any injection surface.
const SAFE_COLOR_RE = /^#[0-9a-fA-F]{3,8}$|^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$|^[a-zA-Z]{1,20}$/;

function safeColor(value) {
  return typeof value === 'string' && SAFE_COLOR_RE.test(value.trim()) ? value.trim() : '';
}

/* -------------------------------------------------------------------------- */
/* Fund age + analytics (shared by admin internals and the client view)       */
/* -------------------------------------------------------------------------- */

export function computeFundAge(launchDate) {
  if (!launchDate) return null;
  const start = new Date(launchDate);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();

  const diffMs = now - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  const days = diffDays % 30;

  let display = '';
  if (years > 0) display += `${years}y `;
  if (months > 0) display += `${months}mo `;
  if (years === 0 && months === 0) display += `${days}d`;
  display = display.trim();

  const totalYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  return { years, months, days, diffDays, totalYears, display };
}

// Full analytics — includes admin-only rupee figures. Never send directly to
// clients; use `toClientAnalytics` for the client payload.
export function computeFundAnalytics(fund) {
  if (!fund) return null;

  const sectors = Array.isArray(fund.sectors) ? fund.sectors : [];
  const investments = Array.isArray(fund.investments) ? fund.investments : [];
  const totalInvested = investments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const sectorTotal = sectors.reduce((sum, s) => sum + (s.percentage || 0), 0);
  const sectorValid = Math.abs(sectorTotal - 100) < 0.1;
  const fundAge = computeFundAge(fund.launchDate);
  const initialInvestment = toFiniteNumber(fund.initialInvestment) ?? 0;

  return {
    sectorTotal,
    sectorValid,
    totalInvested,
    sectorCount: sectors.length,
    investmentCount: investments.length,
    fundAge,
    initialInvestment,
  };
}

// Client-safe analytics: everything except the raw rupee figures.
export function toClientAnalytics(fund) {
  const full = computeFundAnalytics(fund);
  if (!full) return null;
  const { totalInvested, initialInvestment, ...safe } = full;
  return safe;
}

/* -------------------------------------------------------------------------- */
/* Display-field sanitizers (used by admin create/update before persistence)  */
/* -------------------------------------------------------------------------- */

export function normalizePerformanceSeries(series) {
  if (!Array.isArray(series)) return [];
  return series
    .map((point) => {
      const fund = toFiniteNumber(point?.fund);
      const nifty = toFiniteNumber(point?.nifty);
      if (!isIsoDateLike(point?.date) || fund === null || nifty === null) return null;
      if (fund <= 0 || nifty <= 0) return null;
      return { date: point.date, fund, nifty };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function sanitizePerformancePeriods(periods) {
  if (!Array.isArray(periods)) return [];
  return periods
    .map((period) => {
      if (!PERFORMANCE_PERIOD_KEYS.has(period?.key)) return null;
      const fundReturnPct = toFiniteNumber(period.fundReturnPct);
      const niftyReturnPct = toFiniteNumber(period.niftyReturnPct);
      return {
        key: period.key,
        label: typeof period.label === 'string' && period.label.trim() ? period.label.trim() : period.key,
        fundReturnPct,
        niftyReturnPct,
        annualized: period.annualized === true,
      };
    })
    .filter(Boolean);
}

export function sanitizePerformanceSummary(summary) {
  if (!summary || typeof summary !== 'object') return null;
  const selectedPeriod = PERFORMANCE_PERIOD_KEYS.has(summary.selectedPeriod) ? summary.selectedPeriod : null;
  return {
    selectedPeriod,
    annualizedReturnPct: toFiniteNumber(summary.annualizedReturnPct),
    oneDayReturnPct: toFiniteNumber(summary.oneDayReturnPct),
    niftyReturnPct: toFiniteNumber(summary.niftyReturnPct),
    asOf: isIsoDateLike(summary.asOf) ? summary.asOf : '',
  };
}

export function sanitizeAssetAllocation(allocation) {
  if (!Array.isArray(allocation)) return [];
  return allocation
    .map((slice) => {
      const percentage = toFiniteNumber(slice?.percentage);
      if (percentage === null || percentage < 0 || percentage > 100) return null;
      return {
        id: typeof slice.id === 'string' && slice.id.trim() ? slice.id.trim() : String(slice.label || '').toLowerCase(),
        label: String(slice.label || '').trim(),
        percentage,
        color: safeColor(slice.color),
      };
    })
    .filter(Boolean);
}

const ADVANCED_RATIO_KEYS = ['pe', 'pb', 'beta', 'alpha', 'sharpe', 'sortino'];

export function sanitizeAdvancedRatios(ratios) {
  if (!ratios || typeof ratios !== 'object') return {};
  const out = {};
  for (const key of ADVANCED_RATIO_KEYS) {
    const value = toFiniteNumber(ratios[key]);
    if (value !== null) out[key] = value;
  }
  return out;
}

export function sanitizeNav(nav) {
  if (!nav || typeof nav !== 'object') return null;
  const value = toFiniteNumber(nav.value);
  if (value === null) return null;
  return { value, asOf: isIsoDateLike(nav.asOf) ? nav.asOf : '' };
}

export function sanitizeRating(rating) {
  if (!rating || typeof rating !== 'object') return null;
  const value = toFiniteNumber(rating.value);
  if (value === null || value < 0) return null;
  const rawScale = toFiniteNumber(rating.scale);
  const scale = rawScale !== null && rawScale > 0 ? rawScale : 5;
  return { value: Math.min(value, scale), scale };
}

/* -------------------------------------------------------------------------- */
/* Client view                                                                */
/* -------------------------------------------------------------------------- */

function buildClientInvestments(fund, cfg) {
  if (cfg.showInvestmentBreakdown === false || !Array.isArray(fund.investments)) return [];
  const totalInvested = fund.investments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  return fund.investments.map((i) => ({
    id: i.id,
    companyName: cfg.showCompanyNames !== false ? i.companyName : `Company ${String(i.id || '').slice(-4)}`,
    sectorId: i.sectorId,
    percentage: totalInvested > 0 ? Math.round((Number(i.amount) / totalInvested) * 1000) / 10 : 0,
  }));
}

export function toClientFund(fund) {
  if (!fund) return null;
  if (!CLIENT_VISIBLE_STAGES.has(fund.lifecycleStage)) return null;

  const cfg = fund.chartConfig || {};
  const sectors = cfg.showSectorDistribution !== false ? (Array.isArray(fund.sectors) ? fund.sectors : []) : [];
  const investments = buildClientInvestments(fund, cfg);

  const allocation = sectors.map((s) => ({ label: s.name, pct: s.percentage }));
  const topHoldings = investments
    .map((i) => ({ name: i.companyName, pct: i.percentage }))
    .sort((a, b) => b.pct - a.pct);

  // Strip admin-only / raw fields, then re-add display-safe ones under gates.
  const {
    investments: _rawInvestments,
    sectors: _rawSectors,
    initialInvestment: _initialInvestment,
    currentValue: _currentValue,
    // Strip any pre-enriched analytics so the rupee-bearing object can never
    // reach `rest`; the client-safe analytics is re-added explicitly below.
    analytics: _preEnrichedAnalytics,
    performanceSeries: _series,
    performancePeriods: _periods,
    performanceSummary: _summary,
    assetAllocation: _assetAllocation,
    advancedRatios: _advancedRatios,
    ...rest
  } = fund;

  const trackingFallback = `FP-${String(rest.id || '').replace(/-/g, '').slice(0, 10).toUpperCase()}`;
  const client = {
    ...rest,
    trackingId: rest.trackingId || rest.fundCode || trackingFallback,
    fundCode: rest.fundCode || rest.trackingId || trackingFallback,
    sectors,
    investments,
    allocation,
    topHoldings,
    analytics: toClientAnalytics(fund),
  };

  if (cfg.showBenchmarkComparison !== false) {
    const normalizedSeries = normalizePerformanceSeries(fund.performanceSeries);
    if (normalizedSeries.length >= 2) client.performanceSeries = normalizedSeries;
    const normalizedPeriods = sanitizePerformancePeriods(fund.performancePeriods);
    if (normalizedPeriods.length > 0) client.performancePeriods = normalizedPeriods;
    const normalizedSummary = sanitizePerformanceSummary(fund.performanceSummary);
    if (normalizedSummary) client.performanceSummary = normalizedSummary;
  }

  if (cfg.showAssetAllocation !== false) {
    const normalizedAllocation = sanitizeAssetAllocation(fund.assetAllocation);
    if (normalizedAllocation.length > 0) client.assetAllocation = normalizedAllocation;
  }

  if (cfg.showAdvancedRatios !== false) {
    const normalizedRatios = sanitizeAdvancedRatios(fund.advancedRatios);
    if (Object.keys(normalizedRatios).length > 0) client.advancedRatios = normalizedRatios;
  }

  return client;
}

export function toClientFunds(funds) {
  return (funds || []).map(toClientFund).filter(Boolean);
}

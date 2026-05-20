import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { jsonStoreEnabled, readJsonStore, updateJsonStore } from '#db/jsonStore.js';

const DUAL_APPROVAL_THRESHOLD = 500000;

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toTrimmedString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

export function computeFundAge(launchDate) {
  if (!launchDate) return null;
  const start = new Date(launchDate);
  const now = new Date();
  if (Number.isNaN(start.getTime())) return null;

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

export function computeFundAnalytics(fund) {
  if (!fund) return null;

  const sectors = Array.isArray(fund.sectors) ? fund.sectors : [];
  const investments = Array.isArray(fund.investments) ? fund.investments : [];
  const totalInvested = investments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const sectorTotal = sectors.reduce((sum, s) => sum + (s.percentage || 0), 0);
  const sectorValid = Math.abs(sectorTotal - 100) < 0.1;
  const fundAge = computeFundAge(fund.launchDate);
  const initialInvestment = toNumber(fund.initialInvestment, 0);

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

function enrichFundWithAnalytics(fund) {
  return { ...fund, analytics: computeFundAnalytics(fund) };
}

export async function listFunds(config) {
  if (!jsonStoreEnabled(config)) {
    return { items: [], count: 0, source: 'postgres_pending' };
  }

  const store = await readJsonStore(config);
  const items = Array.isArray(store.funds) ? store.funds : [];
  return { items: items.map(enrichFundWithAnalytics), count: items.length, source: 'json' };
}

export async function getFund(config, fundId) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for funds is not yet implemented.');
  }

  const store = await readJsonStore(config);
  const fund = (store.funds || []).find((f) => f.id === fundId);

  if (!fund) {
    throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);
  }

  return fund;
}

export function toClientFund(fund) {
  if (!fund) return null;

  const CLIENT_VISIBLE_STAGES = new Set(['published', 'active', 'paused', 'closed']);
  if (!CLIENT_VISIBLE_STAGES.has(fund.lifecycleStage)) return null;

  const cfg = fund.chartConfig || {};
  const sectors = cfg.showSectorDistribution !== false ? fund.sectors : [];

  let investments = [];
  if (cfg.showInvestmentBreakdown !== false && Array.isArray(fund.investments)) {
    const totalInvested = fund.investments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    investments = fund.investments.map((i) => ({
      id: i.id,
      companyName: cfg.showCompanyNames !== false ? i.companyName : `Company ${i.id.slice(-4)}`,
      sectorId: i.sectorId,
      percentage: totalInvested > 0 ? Math.round((Number(i.amount) / totalInvested) * 1000) / 10 : 0,
    }));
  }

  const allocation = Array.isArray(sectors)
    ? sectors.map((s) => ({ label: s.name, pct: s.percentage }))
    : [];

  const topHoldings = investments
    .map((i) => ({ name: i.companyName, pct: i.percentage }))
    .sort((a, b) => b.pct - a.pct);

  const analytics = computeFundAnalytics(fund);

  const {
    investments: _originalInvestments,
    sectors: _originalSectors,
    ...rest
  } = fund;

  return {
    ...rest,
    sectors,
    investments,
    allocation,
    topHoldings,
    analytics,
  };
}

export function toClientFunds(funds) {
  return (funds || []).map(toClientFund).filter(Boolean);
}

export async function createRedemptionRequest(config, userId, body) {
  const { fundId, amount, type, holdingId } = body || {};
  const amt = toNumber(amount, 0);

  if (!fundId && !holdingId) throw new HttpError(400, 'INVALID_REQUEST', 'Fund ID or Holding ID is required.');
  if (amt <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0.');

  return updateJsonStore(config, (store) => {
    let resolvedFundId = fundId;
    let holding = null;

    if (holdingId && !resolvedFundId) {
      const portfolio = store[`portfolio_${userId}`];
      if (portfolio && Array.isArray(portfolio.holdings)) {
        holding = portfolio.holdings.find((h) => (h.id || h.fundId) === holdingId) || null;
      }
      if (!holding) throw new HttpError(404, 'HOLDING_NOT_FOUND', 'Holding not found.');
      resolvedFundId = holding.fundId;
    }

    const fund = (store.funds || []).find((f) => f.id === resolvedFundId);
    if (!fund) throw new HttpError(404, 'FUND_NOT_FOUND', 'Fund not found.');

    if (!holding) {
      const portfolio = store[`portfolio_${userId}`];
      if (portfolio && Array.isArray(portfolio.holdings)) {
        holding = portfolio.holdings.find((h) => h.fundId === resolvedFundId) || null;
      }
    }

    if (!holding) throw new HttpError(404, 'HOLDING_NOT_FOUND', 'Holding not found.');

    const holdingValue = toNumber(holding.currentValue, 0);
    if (amt > holdingValue + 0.001) {
      throw new HttpError(400, 'INSUFFICIENT_HOLDINGS', `Insufficient holdings. Available: ₹${holdingValue}, requested: ₹${amt}.`);
    }

    if (amt < (fund.minSip || 0)) {
      throw new HttpError(400, 'BELOW_MINIMUM', `Minimum redemption is ₹${fund.minSip || 0}.`);
    }

    const redemptionType = type || (amt >= holdingValue - 0.001 ? 'full' : 'partial');
    if (!['full', 'partial'].includes(redemptionType)) throw new HttpError(400, 'INVALID_TYPE', 'Type must be full or partial.');

    const oldUnits = toNumber(holding.units, 0);
    const reservedUnits = holdingValue > 0 ? oldUnits * (amt / holdingValue) : 0;
    const newValue = holdingValue - amt;
    if (newValue <= 0.001) {
      holding.currentValue = 0;
      holding.units = 0;
    } else {
      holding.currentValue = newValue;
      holding.units = Math.max(0, oldUnits - reservedUnits);
    }

    const requiresDualApproval = amt > DUAL_APPROVAL_THRESHOLD;
    const request = {
      id: randomUUID(),
      userId,
      fundId: resolvedFundId,
      fundName: fund.name,
      amount: amt,
      type: redemptionType,
      status: 'pending',
      reason: toTrimmedString(body.reason),
      requestedAt: new Date().toISOString(),
      processedAt: null,
      processedBy: null,
      requiresDualApproval: body.requiresDualApproval ?? requiresDualApproval,
      dualApprovalThresholdConfigVersion: body.dualApprovalThresholdConfigVersion ?? (requiresDualApproval ? 'default-500000' : null),
      approvals: body.approvals ?? [],
      reservedHoldingValue: amt,
      reservedHoldingUnits: reservedUnits,
    };

    if (!Array.isArray(store.redemptionRequests)) store.redemptionRequests = [];
    store.redemptionRequests.push(request);
    return request;
  });
}

export async function listRedemptionRequests(config, { status, userId, fundId } = {}) {
  const store = await readJsonStore(config);
  let items = store.redemptionRequests || [];

  if (status) items = items.filter((r) => r.status === status);
  if (userId) items = items.filter((r) => r.userId === userId);
  if (fundId) items = items.filter((r) => r.fundId === fundId);

  items.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

  return { items, count: items.length };
}

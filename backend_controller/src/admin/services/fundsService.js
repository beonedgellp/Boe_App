import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { jsonStoreEnabled, readJsonStore, updateJsonStore } from '#db/jsonStore.js';
import { withReceipt } from '#shared/services/withReceipt.js';

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toTrimmedString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const DUAL_APPROVAL_THRESHOLD = 500000;

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
  const n = sectors.length;

  const totalInvested = investments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  // Sector validation
  const sectorTotal = sectors.reduce((sum, s) => sum + (s.percentage || 0), 0);
  const sectorValid = Math.abs(sectorTotal - 100) < 0.1;

  // Fund age from launch date
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

export async function createFund(config, actor, body, requestContext = {}) {
  const payload = body && typeof body === 'object' ? body : {};
  const name = toTrimmedString(payload.name);

  if (!name) {
    throw new HttpError(400, 'INVALID_FUND', 'Fund name is required.');
  }

  const rawStatus = toTrimmedString(payload.status, 'coming_soon');
  const status = ['active', 'coming_soon'].includes(rawStatus) ? rawStatus : 'coming_soon';

  const incomingChartConfig = plainObject(payload.chartConfig) ? payload.chartConfig : {};

  const fund = {
    id: randomUUID(),
    name,
    tagline: toTrimmedString(payload.tagline),
    status,
    lifecycleStage: ['draft', 'published', 'active', 'paused', 'closed', 'archived'].includes(payload.lifecycleStage)
      ? payload.lifecycleStage
      : 'draft',
    totalPoolSize: toNumber(payload.totalPoolSize, 0),
    initialInvestment: toNumber(payload.initialInvestment, 0),
    currentValue: toNumber(payload.currentValue, 0),
    launchDate: toTrimmedString(payload.launchDate),
    minSip: toNumber(payload.minSip, 0),
    minLumpsum: toNumber(payload.minLumpsum, 0),
    minDurationMonths: toNumber(payload.minDurationMonths, 0),
    lockInText: toTrimmedString(payload.lockInText),
    riskLabel: toTrimmedString(payload.riskLabel),
    sectors: Array.isArray(payload.sectors) ? payload.sectors : [],
    investments: Array.isArray(payload.investments) ? payload.investments : [],
    chartConfig: {
      showSectorDistribution: incomingChartConfig.showSectorDistribution !== false,
      showInvestmentBreakdown: incomingChartConfig.showInvestmentBreakdown !== false,
      showCompanyNames: incomingChartConfig.showCompanyNames !== false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for funds is not yet implemented.');
  }

  await updateJsonStore(config, (store) => {
    store.funds.push(fund);
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'fund.create',
      entityType: 'fund',
      entityId: fund.id,
      before: null,
      after: fund,
      reason: payload.reason || 'Admin created fund record.',
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      createdAt: fund.createdAt,
    });
    return fund;
  });

  return fund;
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

export async function updateFund(config, actor, fundId, body, requestContext = {}) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for funds is not yet implemented.');
  }

  const payload = body && typeof body === 'object' ? body : {};

  const updated = await updateJsonStore(config, (store) => {
    const idx = (store.funds || []).findIndex((f) => f.id === fundId);
    if (idx === -1) return null;

    const existing = store.funds[idx];
    const now = new Date().toISOString();

    const rawStatus = toTrimmedString(payload.status, existing.status);
    const status = ['active', 'coming_soon'].includes(rawStatus) ? rawStatus : existing.status;

    const nextChartConfig = payload.chartConfig !== undefined
      ? (plainObject(payload.chartConfig) ? payload.chartConfig : existing.chartConfig)
      : existing.chartConfig;

    const next = {
      ...existing,
      name: payload.name !== undefined ? toTrimmedString(payload.name, existing.name) : existing.name,
      tagline: payload.tagline !== undefined ? toTrimmedString(payload.tagline) : existing.tagline,
      status,
      lifecycleStage: payload.lifecycleStage !== undefined
        ? (['draft', 'published', 'active', 'paused', 'closed', 'archived'].includes(payload.lifecycleStage)
            ? payload.lifecycleStage
            : existing.lifecycleStage)
        : existing.lifecycleStage,
      totalPoolSize: payload.totalPoolSize !== undefined ? toNumber(payload.totalPoolSize, existing.totalPoolSize) : existing.totalPoolSize,
      initialInvestment: payload.initialInvestment !== undefined ? toNumber(payload.initialInvestment, existing.initialInvestment) : existing.initialInvestment,
      currentValue: payload.currentValue !== undefined ? toNumber(payload.currentValue, existing.currentValue) : existing.currentValue,
      launchDate: payload.launchDate !== undefined ? toTrimmedString(payload.launchDate) : existing.launchDate,
      minSip: payload.minSip !== undefined ? toNumber(payload.minSip, existing.minSip) : existing.minSip,
      minLumpsum: payload.minLumpsum !== undefined ? toNumber(payload.minLumpsum, existing.minLumpsum) : existing.minLumpsum,
      minDurationMonths: payload.minDurationMonths !== undefined ? toNumber(payload.minDurationMonths, existing.minDurationMonths) : existing.minDurationMonths,
      lockInText: payload.lockInText !== undefined ? toTrimmedString(payload.lockInText) : existing.lockInText,
      riskLabel: payload.riskLabel !== undefined ? toTrimmedString(payload.riskLabel) : existing.riskLabel,
      sectors: payload.sectors !== undefined ? (Array.isArray(payload.sectors) ? payload.sectors : existing.sectors) : existing.sectors,
      investments: payload.investments !== undefined ? (Array.isArray(payload.investments) ? payload.investments : existing.investments) : existing.investments,
      chartConfig: {
        showSectorDistribution: nextChartConfig.showSectorDistribution !== false,
        showInvestmentBreakdown: nextChartConfig.showInvestmentBreakdown !== false,
        showCompanyNames: nextChartConfig.showCompanyNames !== false,
      },
      updatedAt: now,
    };

    store.funds[idx] = next;
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'fund.update',
      entityType: 'fund',
      entityId: next.id,
      before: existing,
      after: next,
      reason: payload.reason || 'Admin updated fund record.',
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      createdAt: now,
    });

    return next;
  });

  if (!updated) throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);
  return updated;
}

export async function deleteFund(config, actor, fundId, requestContext = {}) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for funds is not yet implemented.');
  }

  const deleted = await updateJsonStore(config, (store) => {
    const idx = (store.funds || []).findIndex((f) => f.id === fundId);
    if (idx === -1) return null;

    const existing = store.funds[idx];
    const now = new Date().toISOString();

    store.funds.splice(idx, 1);
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'fund.delete',
      entityType: 'fund',
      entityId: existing.id,
      before: existing,
      after: null,
      reason: 'Admin deleted fund record.',
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      createdAt: now,
    });

    return existing;
  });

  if (!deleted) throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);
  return deleted;
}

export function toClientFund(fund) {
  if (!fund) return null;

  const CLIENT_VISIBLE_STAGES = new Set(['published', 'active', 'paused', 'closed']);
  if (!CLIENT_VISIBLE_STAGES.has(fund.lifecycleStage)) return null;

  const cfg = fund.chartConfig || {};

  // If showSectorDistribution is false, don't send sectors
  const sectors = cfg.showSectorDistribution !== false ? fund.sectors : [];

  // If showInvestmentBreakdown is false, don't send investments
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


/* -------------------------------------------------------------------------- */
/* Capital Flow & Allocation Management                                       */
/* -------------------------------------------------------------------------- */

function getFundFromStore(store, fundId) {
  const idx = (store.funds || []).findIndex((f) => f.id === fundId);
  return idx >= 0 ? { fund: store.funds[idx], index: idx } : null;
}

function addCapitalTransaction(store, tx) {
  store.capitalTransactions.push({
    id: randomUUID(),
    ...tx,
    createdAt: new Date().toISOString(),
  });
}

function addRedemptionRequestRecord(store, req) {
  store.redemptionRequests.push({
    id: randomUUID(),
    ...req,
    requestedAt: new Date().toISOString(),
  });
}

/**
 * Allocate cash to an investment (move from cash to a company/sector).
 * Reduces implicit cash, increases investment amount.
 */
export async function allocateFunds(config, actor, fundId, body, requestContext = {}) {
  const { investmentId, amount, reason } = body || {};
  const amt = toNumber(amount, 0);

  if (!investmentId) throw new HttpError(400, 'INVALID_REQUEST', 'Investment ID is required.');
  if (amt <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0.');

  const result = await updateJsonStore(config, (store) => {
    const found = getFundFromStore(store, fundId);
    if (!found) return null;
    const { fund } = found;

    const analytics = computeFundAnalytics(fund);
    const cash = (Number(fund.totalPoolSize) || 0) - analytics.totalInvested;
    if (amt > cash) {
      throw new HttpError(400, 'INSUFFICIENT_CASH', 'Not enough unallocated cash for this allocation.');
    }

    const inv = fund.investments.find((i) => i.id === investmentId);
    if (!inv) throw new HttpError(404, 'INVESTMENT_NOT_FOUND', 'Investment not found.');

    inv.amount = (Number(inv.amount) || 0) + amt;
    fund.updatedAt = new Date().toISOString();

    addCapitalTransaction(store, {
      fundId,
      type: 'allocation',
      amount: amt,
      source: 'cash',
      target: inv.companyName || investmentId,
      reason: toTrimmedString(reason, 'Fund allocation'),
      createdBy: actor?.userId || null,
    });

    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'fund.allocate',
      entityType: 'fund',
      entityId: fundId,
      before: { investmentAmount: inv.amount - amt },
      after: { investmentAmount: inv.amount },
      reason: toTrimmedString(reason, 'Fund allocation'),
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      createdAt: fund.updatedAt,
    });

    return fund;
  });

  if (!result) throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);
  return result;
}

/**
 * Unallocate funds from an investment (move back to cash).
 * Reduces investment amount, increases implicit cash.
 */
export async function unallocateFunds(config, actor, fundId, body, requestContext = {}) {
  const { investmentId, amount, reason } = body || {};
  const amt = toNumber(amount, 0);

  if (!investmentId) throw new HttpError(400, 'INVALID_REQUEST', 'Investment ID is required.');
  if (amt <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0.');

  const result = await updateJsonStore(config, (store) => {
    const found = getFundFromStore(store, fundId);
    if (!found) return null;
    const { fund } = found;

    const inv = fund.investments.find((i) => i.id === investmentId);
    if (!inv) throw new HttpError(404, 'INVESTMENT_NOT_FOUND', 'Investment not found.');

    const currentAmount = Number(inv.amount) || 0;
    if (amt > currentAmount) {
      throw new HttpError(400, 'OVER_WITHDRAWAL', `Cannot unallocate ₹${amt}. Investment only has ₹${currentAmount}.`);
    }

    inv.amount = currentAmount - amt;
    fund.updatedAt = new Date().toISOString();

    addCapitalTransaction(store, {
      fundId,
      type: 'unallocation',
      amount: amt,
      source: inv.companyName || investmentId,
      target: 'cash',
      reason: toTrimmedString(reason, 'Fund unallocation'),
      createdBy: actor?.userId || null,
    });

    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'fund.unallocate',
      entityType: 'fund',
      entityId: fundId,
      before: { investmentAmount: currentAmount },
      after: { investmentAmount: inv.amount },
      reason: toTrimmedString(reason, 'Fund unallocation'),
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      createdAt: fund.updatedAt,
    });

    return fund;
  });

  if (!result) throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);
  return result;
}

/**
 * Admin external outflow — withdraw funds from the pool entirely.
 * Reduces cash first, then proportionally from investments if needed.
 */
export async function adminOutflow(config, actor, fundId, body, requestContext = {}) {
  const { amount, reason } = body || {};
  const amt = toNumber(amount, 0);

  if (amt <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0.');
  if (!toTrimmedString(reason)) throw new HttpError(400, 'REASON_REQUIRED', 'Reason is required for withdrawals.');

  const result = await updateJsonStore(config, (store) => {
    const found = getFundFromStore(store, fundId);
    if (!found) return null;
    const { fund } = found;

    const analytics = computeFundAnalytics(fund);
    const cash = (Number(fund.totalPoolSize) || 0) - analytics.totalInvested;

    if (amt > fund.totalPoolSize) {
      throw new HttpError(400, 'OVER_WITHDRAWAL', `Cannot withdraw ₹${amt}. Pool size is only ₹${fund.totalPoolSize}.`);
    }

    // Reduce total pool size
    fund.totalPoolSize = Math.max(0, fund.totalPoolSize - amt);

    // Reduce cash first, then proportionally from investments
    let remaining = amt;
    if (cash >= remaining) {
      remaining = 0;
    } else {
      remaining -= cash;
      // Reduce proportionally from investments
      const totalInv = analytics.totalInvested;
      if (totalInv > 0 && remaining > 0) {
        for (const inv of fund.investments) {
          const invAmt = Number(inv.amount) || 0;
          if (invAmt <= 0) continue;
          const reduction = Math.min(invAmt, Math.round((invAmt / totalInv) * remaining));
          inv.amount = invAmt - reduction;
          remaining -= reduction;
          if (remaining <= 0) break;
        }
      }
    }

    fund.updatedAt = new Date().toISOString();

    addCapitalTransaction(store, {
      fundId,
      type: 'outflow',
      amount: amt,
      source: 'pool',
      target: 'external',
      reason: toTrimmedString(reason),
      createdBy: actor?.userId || null,
    });

    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'fund.outflow',
      entityType: 'fund',
      entityId: fundId,
      before: { totalPoolSize: fund.totalPoolSize + amt },
      after: { totalPoolSize: fund.totalPoolSize },
      reason: toTrimmedString(reason),
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      createdAt: fund.updatedAt,
    });

    return fund;
  });

  if (!result) throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);
  return result;
}

/**
 * Admin inflow — add capital to the pool.
 */
export async function adminInflow(config, actor, fundId, body, requestContext = {}) {
  const { amount, reason } = body || {};
  const amt = toNumber(amount, 0);

  if (amt <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0.');

  const result = await updateJsonStore(config, (store) => {
    const found = getFundFromStore(store, fundId);
    if (!found) return null;
    const { fund } = found;

    fund.totalPoolSize = (Number(fund.totalPoolSize) || 0) + amt;
    fund.updatedAt = new Date().toISOString();

    addCapitalTransaction(store, {
      fundId,
      type: 'inflow',
      amount: amt,
      source: 'external',
      target: 'pool',
      reason: toTrimmedString(reason, 'Capital inflow'),
      createdBy: actor?.userId || null,
    });

    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'fund.inflow',
      entityType: 'fund',
      entityId: fundId,
      before: { totalPoolSize: fund.totalPoolSize - amt },
      after: { totalPoolSize: fund.totalPoolSize },
      reason: toTrimmedString(reason, 'Capital inflow'),
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      createdAt: fund.updatedAt,
    });

    return fund;
  });

  if (!result) throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);
  return result;
}

/* -------------------------------------------------------------------------- */
/* Redemption Requests (User withdrawals)                                     */
/* -------------------------------------------------------------------------- */

export async function createRedemptionRequest(config, userId, body) {
  const { fundId, amount, type, holdingId } = body || {};
  const amt = toNumber(amount, 0);

  if (!fundId && !holdingId) throw new HttpError(400, 'INVALID_REQUEST', 'Fund ID or Holding ID is required.');
  if (amt <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0.');

  const result = await updateJsonStore(config, (store) => {
    let resolvedFundId = fundId;
    let holding = null;

    // If holdingId provided, look up the holding and resolve fundId
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

    // Find holding by fundId if not already resolved
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

    // Decrement holding
    const oldValue = holdingValue;
    const oldUnits = toNumber(holding.units, 0);
    const reservedUnits = oldValue > 0 ? oldUnits * (amt / oldValue) : 0;
    const newValue = oldValue - amt;
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

  return result;
}

export async function listRedemptionRequests(config, { status, userId, fundId } = {}) {
  const store = await readJsonStore(config);
  let items = store.redemptionRequests || [];

  if (status) items = items.filter((r) => r.status === status);
  if (userId) items = items.filter((r) => r.userId === userId);
  if (fundId) items = items.filter((r) => r.fundId === fundId);

  // Sort newest first
  items.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

  return { items, count: items.length };
}

async function _processRedemptionRequest(config, actor, requestId, body, requestContext = {}) {
  const { action, reason } = body || {};
  if (!['approved', 'rejected'].includes(action)) {
    throw new HttpError(400, 'INVALID_ACTION', 'Action must be approved or rejected.');
  }

  const result = await updateJsonStore(config, (store) => {
    const idx = (store.redemptionRequests || []).findIndex((r) => r.id === requestId);
    if (idx === -1) return null;

    const req = store.redemptionRequests[idx];
    if (req.status !== 'pending') {
      throw new HttpError(400, 'ALREADY_PROCESSED', `Request already ${req.status}.`);
    }

    const now = new Date().toISOString();

    // If approved, reduce fund pool size
    if (action === 'approved') {
      // Holding was already decremented atomically at creation time; just verify it still exists
      if (req.fundId) {
        const portfolio = store[`portfolio_${req.userId}`] || { holdings: [] };
        const holding = (portfolio.holdings || []).find((h) => h.fundId === req.fundId);
        if (!holding) {
          throw new HttpError(400, 'HOLDING_NOT_FOUND', 'User holding not found for this fund.');
        }
      }

      const fundIdx = (store.funds || []).findIndex((f) => f.id === req.fundId);
      if (fundIdx >= 0) {
        const fund = store.funds[fundIdx];
        if (req.amount > fund.totalPoolSize) {
          throw new HttpError(400, 'INSUFFICIENT_FUNDS', 'Fund does not have enough capital for this redemption.');
        }
        fund.totalPoolSize = Math.max(0, fund.totalPoolSize - req.amount);
        fund.updatedAt = now;

        // Reduce proportionally from investments (cash first, then proportional)
        const analytics = computeFundAnalytics(fund);
        const cash = (Number(fund.totalPoolSize) || 0) - analytics.totalInvested;
        let remaining = req.amount;
        if (cash >= remaining) {
          remaining = 0;
        } else {
          remaining -= cash;
          const totalInv = analytics.totalInvested;
          if (totalInv > 0 && remaining > 0) {
            for (const inv of fund.investments) {
              const invAmt = Number(inv.amount) || 0;
              if (invAmt <= 0) continue;
              const reduction = Math.min(invAmt, Math.round((invAmt / totalInv) * remaining));
              inv.amount = invAmt - reduction;
              remaining -= reduction;
              if (remaining <= 0) break;
            }
          }
        }
      }
    } else if (action === 'rejected') {
      // Restore user's holding since redemption was rejected
      if (req.fundId) {
        const portfolio = store[`portfolio_${req.userId}`] || { holdings: [] };
        const holding = (portfolio.holdings || []).find((h) => h.fundId === req.fundId);
        if (holding) {
          const restoreValue = toNumber(req.reservedHoldingValue, req.amount);
          const restoreUnits = toNumber(req.reservedHoldingUnits, 0);
          holding.currentValue = (Number(holding.currentValue) || 0) + restoreValue;
          holding.units = (Number(holding.units) || 0) + restoreUnits;
        }
      }
    }

    req.status = action;
    req.processedAt = now;
    req.processedBy = actor?.userId || null;
    req.adminReason = toTrimmedString(reason);

    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: `redemption.${action}`,
      entityType: 'redemption',
      entityId: req.id,
      before: { status: 'pending' },
      after: { status: action, amount: req.amount },
      reason: toTrimmedString(reason, `Redemption ${action}`),
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      createdAt: now,
    });

    return req;
  });

  if (!result) throw new HttpError(404, 'REQUEST_NOT_FOUND', `Redemption request ${requestId} not found.`);
  return result;
}

export const processRedemptionRequest = withReceipt(_processRedemptionRequest, 'redemption_processed', {
  entityType: 'redemption',
  entityId: (result) => result.id,
  afterState: (result) => result.status,
  subjectUserId: (result) => result.userId,
  amount: (result) => result.amount,
  source: 'derived',
});

export async function listCapitalTransactions(config, { fundId, type, limit = 50 } = {}) {
  const store = await readJsonStore(config);
  let items = store.capitalTransactions || [];

  if (fundId) items = items.filter((t) => t.fundId === fundId);
  if (type) items = items.filter((t) => t.type === type);

  // Sort newest first, limit
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  items = items.slice(0, limit);

  return { items, count: items.length };
}

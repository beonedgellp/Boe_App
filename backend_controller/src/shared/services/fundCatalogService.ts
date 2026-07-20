import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { readJsonStore, updateJsonStore } from '#db/pgAdapter.js';
import {
  computeFundAge,
  computeFundAnalytics,
  toClientFund,
  toClientFunds,
} from '#shared/services/fundClientView.js';

// Re-exported so existing importers keep their public contract while the
// client-view logic lives in a single source (fundClientView.js).
export { computeFundAge, computeFundAnalytics, toClientFund, toClientFunds };

const DUAL_APPROVAL_THRESHOLD = 500000;

function toNumber(value: any, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toTrimmedString(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function enrichFundWithAnalytics(fund: any) {
  const trackingId = fund.trackingId || fund.fundCode || `FP-${String(fund.id || '').replace(/-/g, '').slice(0, 10).toUpperCase()}`;
  return { ...fund, trackingId, fundCode: trackingId, analytics: computeFundAnalytics(fund) };
}

export async function listFunds(config: AppConfig) {
  const store = await readJsonStore(config);
  const items = Array.isArray(store.funds) ? store.funds : [];
  return { items: items.map(enrichFundWithAnalytics), count: items.length, source: 'json' };
}

export async function getFund(config: AppConfig, fundId: string) {
  const store = await readJsonStore(config);
  const fund = (store.funds || []).find((f) => f.id === fundId);

  if (!fund) {
    throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);
  }

  return fund;
}

export async function createRedemptionRequest(config: AppConfig, userId: string, body: any) {
  const { fundId, amount, type, holdingId } = body || {};
  const amt = toNumber(amount, 0);

  if (!fundId && !holdingId) throw new HttpError(400, 'INVALID_REQUEST', 'Fund ID or Holding ID is required.');
  if (amt <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0.');

  return updateJsonStore(config, (store) => {
    let resolvedFundId = fundId;
    let holding = null;

    if (holdingId && !resolvedFundId) {
      const portfolio: any = store[`portfolio_${userId}`];
      if (portfolio && Array.isArray(portfolio.holdings)) {
        holding = portfolio.holdings.find((h: any) => (h.id || h.fundId) === holdingId) || null;
      }
      if (!holding) throw new HttpError(404, 'HOLDING_NOT_FOUND', 'Holding not found.');
      resolvedFundId = holding.fundId;
    }

    const fund = (store.funds || []).find((f) => f.id === resolvedFundId);
    if (!fund) throw new HttpError(404, 'FUND_NOT_FOUND', 'Fund not found.');

    if (!holding) {
      const portfolio: any = store[`portfolio_${userId}`];
      if (portfolio && Array.isArray(portfolio.holdings)) {
        holding = portfolio.holdings.find((h: any) => h.fundId === resolvedFundId) || null;
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

export async function listRedemptionRequests(config: AppConfig, { status, userId, fundId }: any = {}) {
  const store = await readJsonStore(config);
  let items = store.redemptionRequests || [];

  if (status) items = items.filter((r) => r.status === status);
  if (userId) items = items.filter((r) => r.userId === userId);
  if (fundId) items = items.filter((r) => r.fundId === fundId);

  items.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  return { items, count: items.length };
}

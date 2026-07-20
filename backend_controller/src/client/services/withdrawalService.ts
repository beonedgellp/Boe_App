import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { readJsonStore, updateJsonStore } from '#db/pgAdapter.js';
import { TAX_REGIMES, getTaxRegimeForDate } from '#shared/config/taxConfig.js';
import { withReceipt } from '#shared/services/withReceipt.js';

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getExitLoadRate(fund, holdingPeriodMonths) {
  const schedule = Array.isArray(fund.exitLoadSchedule) ? fund.exitLoadSchedule : [];
  if (schedule.length === 0) {
    // Default: 1% if redeemed within 12 months
    return holdingPeriodMonths < 12 ? 0.01 : 0;
  }
  const sorted = [...schedule].sort((a, b) => b.months - a.months);
  for (const entry of sorted) {
    if (holdingPeriodMonths < entry.months) {
      return toNumber(entry.rate, 0);
    }
  }
  return 0;
}

function monthsBetween(startIso, endIso) {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  return Math.max(0, yearDiff * 12 + monthDiff);
}

function findHolding(store, userId, holdingId) {
  const portfolio = store[`portfolio_${userId}`];
  if (!portfolio || !Array.isArray(portfolio.holdings)) return null;
  return portfolio.holdings.find((h) => (h.id || h.fundId) === holdingId) || null;
}

function findHoldingAllottedAt(store, userId, fundId) {
  const portfolio = store[`portfolio_${userId}`];
  if (portfolio?.holdings) {
    const h = portfolio.holdings.find((h) => h.fundId === fundId || h.id === fundId);
    if (h?.allottedAt) return h.allottedAt;
    if (h?.createdAt) return h.createdAt;
  }
  const txs = (store.transactions || [])
    .filter((t) => t.userId === userId && t.fundId === fundId)
    .sort((a, b) => new Date(a.date || a.createdAt || 0).getTime() - new Date(b.date || b.createdAt || 0).getTime());
  if (txs.length > 0) {
    return txs[0].date || txs[0].createdAt || null;
  }
  return null;
}

export async function previewWithdrawal(config, actor, holdingId, amount, previewDate) {
  const amt = toNumber(amount, 0);
  if (amt <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0.');

  const effectivePreviewDate = previewDate ? new Date(previewDate) : new Date();
  if (Number.isNaN(effectivePreviewDate.getTime())) {
    throw new HttpError(400, 'INVALID_DATE', 'Invalid previewDate.');
  }

  const store = await readJsonStore(config);
  const holding = findHolding(store, actor.userId, holdingId);
  if (!holding) throw new HttpError(404, 'HOLDING_NOT_FOUND', 'Holding not found.');

  const fund = (store.funds || []).find((f) => f.id === holding.fundId);
  if (!fund) throw new HttpError(404, 'FUND_NOT_FOUND', 'Fund not found.');

  const nav = toNumber(fund.nav, holding.currentNav || 0) || null;
  const units = nav > 0 ? amt / nav : null;

  const holdingUnits = toNumber(holding.units, 0);
  const holdingValue = toNumber(holding.currentValue, 0);
  if (amt > holdingValue + 0.001) {
    throw new HttpError(400, 'OVER_WITHDRAWAL', `Cannot redeem ₹${amt}. Holding value is ₹${holdingValue}.`);
  }

  const minRedemption = toNumber(fund.minSip, 0);
  if (amt < minRedemption) {
    throw new HttpError(400, 'BELOW_MINIMUM', `Minimum redemption is ₹${minRedemption}.`);
  }

  const allottedAt = findHoldingAllottedAt(store, actor.userId, holding.fundId);
  const holdingPeriodMonths = allottedAt ? monthsBetween(allottedAt, effectivePreviewDate.toISOString()) : 0;

  const exitLoadRate = getExitLoadRate(fund, holdingPeriodMonths);
  const exitLoadAmount = Math.round(amt * exitLoadRate * 100) / 100;
  const exitLoadFormula = exitLoadRate > 0
    ? `${(exitLoadRate * 100).toFixed(2)}% on gross amount (holding period ${holdingPeriodMonths}mo < 12mo cutoff)`
    : '0% — no exit load applicable';

  const regime = getTaxRegimeForDate(effectivePreviewDate);
  const STT_RATE = regime.sttRate;
  const sttAmount = Math.round(amt * STT_RATE * 100) / 100;

  const avgCost = toNumber(holding.avgCost, 0);
  const costBasis = units * avgCost;
  const gainAmount = Math.max(0, amt - costBasis);

  const isSTCG = holdingPeriodMonths < regime.holdingPeriodCutoffMonths;
  const gainType = isSTCG ? 'STCG' : 'LTCG';

  let taxableGain = 0;
  let taxAmount = 0;
  let taxRate = 0;
  let ltcgExemptionUsed = 0;

  if (gainAmount > 0) {
    if (isSTCG) {
      taxRate = regime.stcgRate;
      taxableGain = gainAmount;
      taxAmount = Math.round(taxableGain * taxRate * 100) / 100;
    } else {
      taxRate = regime.ltcgRate;
      taxableGain = Math.max(0, gainAmount - regime.ltcgExemptionLimit);
      ltcgExemptionUsed = Math.min(gainAmount, regime.ltcgExemptionLimit);
      taxAmount = Math.round(taxableGain * taxRate * 100) / 100;
    }
  }

  const netProceeds = Math.round((amt - exitLoadAmount - sttAmount - taxAmount) * 100) / 100;

  const previewId = randomUUID();
  const calculationDate = new Date().toISOString();

  const preview = {
    id: previewId,
    userId: actor.userId,
    holdingId,
    fundId: holding.fundId,
    fundName: holding.fundName,
    units: units != null ? Math.round(units * 10000) / 10000 : null,
    grossAmount: amt,
    exitLoadAmount,
    exitLoadRate,
    exitLoadFormula,
    sttAmount,
    sttRate: STT_RATE,
    holdingPeriodMonths,
    gainType,
    gainAmount: Math.round(gainAmount * 100) / 100,
    ltcgExemptionUsed,
    ltcgExemptionLimit: regime.ltcgExemptionLimit,
    taxAmount,
    taxRate,
    netProceeds,
    taxConfigVersion: regime === TAX_REGIMES.post_2024_07_23 ? 'post_2024_07_23' : 'pre_2024_07_23',
    previewDate: effectivePreviewDate.toISOString(),
    assumptions: {
      taxRegimeVersion: regime === TAX_REGIMES.post_2024_07_23 ? 'post_2024_07_23' : 'pre_2024_07_23',
      taxRegimeEffectiveFrom: regime.effectiveFrom,
      stcgSection: regime.stcgSection,
      ltcgSection: regime.ltcgSection,
      stcgRate: regime.stcgRate,
      ltcgRate: regime.ltcgRate,
      ltcgExemptionLimit: regime.ltcgExemptionLimit,
      sttRate: regime.sttRate,
      holdingPeriodCutoffMonths: regime.holdingPeriodCutoffMonths,
      calculationDate,
      previewDate: effectivePreviewDate.toISOString(),
    },
    status: 'pending_confirmation',
    createdAt: calculationDate,
  };

  await updateJsonStore(config, (store) => {
    if (!Array.isArray(store.withdrawalPreviews)) store.withdrawalPreviews = [];
    store.withdrawalPreviews.push(preview);
    const cutoff = Date.now() - 30 * 60 * 1000;
    store.withdrawalPreviews = store.withdrawalPreviews.filter(
      (p) => new Date(p.createdAt).getTime() > cutoff
    );
    return preview;
  });

  return preview;
}

const DUAL_APPROVAL_THRESHOLD = 500000;

async function _createRedemption(config, actor, previewId) {
  if (!previewId) throw new HttpError(400, 'INVALID_REQUEST', 'Preview ID is required.');

  const request = await updateJsonStore(config, (store) => {
    const preview = (store.withdrawalPreviews || []).find(
      (p) => p.id === previewId && p.userId === actor.userId
    );
    if (!preview) throw new HttpError(404, 'PREVIEW_NOT_FOUND', 'Preview not found or expired.');

    const holding = findHolding(store, actor.userId, preview.holdingId);
    if (!holding) throw new HttpError(404, 'HOLDING_NOT_FOUND', 'Holding not found.');

    const holdingValue = toNumber(holding.currentValue, 0);
    if (preview.grossAmount > holdingValue + 0.001) {
      throw new HttpError(400, 'INSUFFICIENT_HOLDINGS', `Insufficient holdings. Available: ₹${holdingValue}, requested: ₹${preview.grossAmount}.`);
    }

    const redemptionType = preview.grossAmount >= holdingValue - 0.001 ? 'full' : 'partial';
    const requiresDualApproval = preview.grossAmount > DUAL_APPROVAL_THRESHOLD;

    // Decrement holding
    const oldValue = holdingValue;
    const oldUnits = toNumber(holding.units, 0);
    const reservedUnits = oldValue > 0
      ? oldUnits * (preview.grossAmount / oldValue)
      : toNumber(preview.units, 0);
    const newValue = oldValue - preview.grossAmount;
    if (newValue <= 0.001) {
      holding.currentValue = 0;
      holding.units = 0;
    } else {
      holding.currentValue = newValue;
      holding.units = Math.max(0, oldUnits - reservedUnits);
    }

    const request = {
      id: randomUUID(),
      userId: actor.userId,
      fundId: preview.fundId,
      fundName: preview.fundName || holding.fundName || '',
      amount: preview.grossAmount,
      type: redemptionType,
      status: 'pending',
      reason: '',
      requestedAt: new Date().toISOString(),
      processedAt: null,
      processedBy: null,
      requiresDualApproval,
      dualApprovalThresholdConfigVersion: requiresDualApproval ? 'default-500000' : null,
      approvals: [],
      previewId,
      previewSnapshot: preview,
      reservedHoldingValue: preview.grossAmount,
      reservedHoldingUnits: reservedUnits,
    };

    if (!Array.isArray(store.redemptionRequests)) store.redemptionRequests = [];
    store.redemptionRequests.push(request);

    return request;
  });

  return request;
}

export const createRedemption = withReceipt(_createRedemption, 'withdrawal_submitted', {
  entityType: 'redemption',
  entityId: (result) => result.id,
  afterState: (result) => result.status,
  amount: (result) => result.amount ?? null,
  currency: () => 'INR',
  source: 'derived',
});

import type { RequestContext } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';
import { TAX_REGIMES, getTaxRegimeForDate } from '#shared/config/taxConfig.js';
import { withReceipt } from '#shared/services/withReceipt.js';

function toNumber(value: any, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getExitLoadRate(fund: any, holdingPeriodMonths: any) {
  const metadata = fund.metadata || {};
  const schedule = Array.isArray(metadata.exitLoadSchedule) ? metadata.exitLoadSchedule : [];
  if (schedule.length === 0) {
    return holdingPeriodMonths < 12 ? 0.01 : 0;
  }
  const sorted = [...schedule].sort((a: any, b: any) => b.months - a.months);
  for (const entry of sorted) {
    if (holdingPeriodMonths < entry.months) {
      return toNumber(entry.rate, 0);
    }
  }
  return 0;
}

function monthsBetween(startIso: any, endIso: any) {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  return Math.max(0, yearDiff * 12 + monthDiff);
}


async function findHolding(userId: string, holdingId: string) {
  const snapshot = await prisma.portfolioSnapshot.findFirst({
    where: { userId },
    orderBy: { asOfDate: 'desc' },
  });
  if (!snapshot) return null;
  const holdings = (snapshot.payload as any)?.holdings;
  if (!Array.isArray(holdings)) return null;
  return holdings.find((h: any) => (h.id || h.fundId) === holdingId) || null;
}

async function findHoldingAllottedAt(userId: string, fundId: string) {
  const snapshot = await prisma.portfolioSnapshot.findFirst({
    where: { userId },
    orderBy: { asOfDate: 'desc' },
  });
  if (snapshot) {
    const holdings = (snapshot.payload as any)?.holdings;
    if (Array.isArray(holdings)) {
      const h = holdings.find((h: any) => h.fundId === fundId || h.id === fundId);
      if (h?.allottedAt) return h.allottedAt;
      if (h?.createdAt) return h.createdAt;
    }
  }
  const tx = await prisma.transaction.findFirst({
    where: { userId, productId: fundId },
    orderBy: { requestedAt: 'asc' },
  });
  return tx ? (tx.requestedAt || tx.createdAt).toISOString() : null;
}


export async function previewWithdrawal(config: AppConfig, actor: Actor, holdingId: string, amount: any, previewDate: any) {
  const amt = toNumber(amount, 0);
  if (amt <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0.');

  const effectivePreviewDate = previewDate ? new Date(previewDate) : new Date();
  if (Number.isNaN(effectivePreviewDate.getTime())) {
    throw new HttpError(400, 'INVALID_DATE', 'Invalid previewDate.');
  }

  const holding = await findHolding(actor.userId, holdingId);
  if (!holding) throw new HttpError(404, 'HOLDING_NOT_FOUND', 'Holding not found.');

  const fund = await prisma.fund.findFirst({ where: { id: holding.fundId } });
  if (!fund) throw new HttpError(404, 'FUND_NOT_FOUND', 'Fund not found.');

  const nav = toNumber((fund.metadata as any)?.nav, holding.currentNav || 0) || null;
  const units = nav && nav > 0 ? amt / nav : null;

  const holdingUnits = toNumber(holding.units, 0);
  const holdingValue = toNumber(holding.currentValue, 0);
  if (amt > holdingValue + 0.001) {
    throw new HttpError(400, 'OVER_WITHDRAWAL', `Cannot redeem ₹${amt}. Holding value is ₹${holdingValue}.`);
  }

  const minRedemption = toNumber(fund.minSip, 0);
  if (amt < minRedemption) {
    throw new HttpError(400, 'BELOW_MINIMUM', `Minimum redemption is ₹${minRedemption}.`);
  }

  const allottedAt = await findHoldingAllottedAt(actor.userId, holding.fundId);
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
  const costBasis = (units || 0) * avgCost;
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


  await prisma.withdrawalPreview.create({
    data: {
      id: previewId,
      userId: actor.userId,
      holdingId,
      amount: amt,
      assumptions: preview.assumptions as any,
      taxConfigVersion: preview.taxConfigVersion,
      payload: preview as any,
      createdAt: new Date(calculationDate),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  return preview;
}

const DUAL_APPROVAL_THRESHOLD = 500000;

async function _createRedemption(config: AppConfig, actor: Actor, previewId: any) {
  if (!previewId) throw new HttpError(400, 'INVALID_REQUEST', 'Preview ID is required.');

  const previewRecord = await prisma.withdrawalPreview.findFirst({
    where: { id: previewId, userId: actor.userId },
  });
  if (!previewRecord) throw new HttpError(404, 'PREVIEW_NOT_FOUND', 'Preview not found or expired.');

  const preview = previewRecord.payload as any;

  const holding = await findHolding(actor.userId, preview.holdingId);
  if (!holding) throw new HttpError(404, 'HOLDING_NOT_FOUND', 'Holding not found.');

  const holdingValue = toNumber(holding.currentValue, 0);
  if (preview.grossAmount > holdingValue + 0.001) {
    throw new HttpError(400, 'INSUFFICIENT_HOLDINGS', `Insufficient holdings. Available: ₹${holdingValue}, requested: ₹${preview.grossAmount}.`);
  }

  const redemptionType = preview.grossAmount >= holdingValue - 0.001 ? 'full' : 'partial';
  const requiresDualApproval = preview.grossAmount > DUAL_APPROVAL_THRESHOLD;

  const oldUnits = toNumber(holding.units, 0);
  const reservedUnits = holdingValue > 0
    ? oldUnits * (preview.grossAmount / holdingValue)
    : toNumber(preview.units, 0);

  const request = await prisma.redemptionRequest.create({
    data: {
      id: randomUUID(),
      userId: actor.userId,
      fundId: preview.fundId || null,
      previewId,
      amount: preview.grossAmount,
      status: 'pending',
      reason: '',
      requiresDualApproval,
      dualApprovalThresholdConfigVersion: requiresDualApproval ? 'default-500000' : null,
      approvals: [],
      metadata: {
        type: redemptionType,
        fundName: preview.fundName || holding.fundName || '',
        reservedHoldingValue: preview.grossAmount,
        reservedHoldingUnits: reservedUnits,
        previewSnapshot: preview,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return {
    id: request.id,
    userId: request.userId,
    fundId: request.fundId,
    fundName: preview.fundName || holding.fundName || '',
    amount: Number(request.amount),
    type: redemptionType,
    status: request.status,
    reason: '',
    requestedAt: request.createdAt.toISOString(),
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
}

export const createRedemption = withReceipt(_createRedemption, 'withdrawal_submitted', {
  entityType: 'redemption',
  entityId: (result: any) => result.id,
  afterState: (result: any) => result.status,
  amount: (result: any) => result.amount ?? null,
  currency: () => 'INR',
  source: 'derived',
});

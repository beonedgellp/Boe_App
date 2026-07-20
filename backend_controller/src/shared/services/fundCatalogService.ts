import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';
import {
  computeFundAge,
  computeFundAnalytics,
  toClientFund,
  toClientFunds,
} from '#shared/services/fundClientView.js';

// Re-exported so existing importers keep their public contract
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
  const trackingId = fund.trackingId || fund.fundCode ||
    `FP-${String(fund.id || '').replace(/-/g, '').slice(0, 10).toUpperCase()}`;
  return { ...fund, trackingId, fundCode: trackingId, analytics: computeFundAnalytics(fund) };
}


export async function listFunds(config: AppConfig) {
  const items = await prisma.fund.findMany();
  return { items: items.map(enrichFundWithAnalytics), count: items.length, source: 'json' };
}

export async function getFund(config: AppConfig, fundId: string) {
  const fund = await prisma.fund.findFirst({ where: { id: fundId } });
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

  let resolvedFundId = fundId;
  let holding: any = null;

  if (holdingId && !resolvedFundId) {
    const snapshot = await prisma.portfolioSnapshot.findFirst({
      where: { userId },
      orderBy: { asOfDate: 'desc' },
    });
    if (snapshot) {
      const holdings = (snapshot.payload as any)?.holdings;
      if (Array.isArray(holdings)) {
        holding = holdings.find((h: any) => (h.id || h.fundId) === holdingId) || null;
      }
    }
    if (!holding) throw new HttpError(404, 'HOLDING_NOT_FOUND', 'Holding not found.');
    resolvedFundId = holding.fundId;
  }

  const fund = await prisma.fund.findFirst({ where: { id: resolvedFundId } });
  if (!fund) throw new HttpError(404, 'FUND_NOT_FOUND', 'Fund not found.');


  if (!holding) {
    const snapshot = await prisma.portfolioSnapshot.findFirst({
      where: { userId },
      orderBy: { asOfDate: 'desc' },
    });
    if (snapshot) {
      const holdings = (snapshot.payload as any)?.holdings;
      if (Array.isArray(holdings)) {
        holding = holdings.find((h: any) => h.fundId === resolvedFundId) || null;
      }
    }
  }

  if (!holding) throw new HttpError(404, 'HOLDING_NOT_FOUND', 'Holding not found.');

  const holdingValue = toNumber(holding.currentValue, 0);
  if (amt > holdingValue + 0.001) {
    throw new HttpError(400, 'INSUFFICIENT_HOLDINGS', `Insufficient holdings. Available: ₹${holdingValue}, requested: ₹${amt}.`);
  }

  if (amt < (toNumber(fund.minSip, 0))) {
    throw new HttpError(400, 'BELOW_MINIMUM', `Minimum redemption is ₹${fund.minSip || 0}.`);
  }

  const redemptionType = type || (amt >= holdingValue - 0.001 ? 'full' : 'partial');
  if (!['full', 'partial'].includes(redemptionType)) throw new HttpError(400, 'INVALID_TYPE', 'Type must be full or partial.');

  const oldUnits = toNumber(holding.units, 0);
  const reservedUnits = holdingValue > 0 ? oldUnits * (amt / holdingValue) : 0;

  const requiresDualApproval = amt > DUAL_APPROVAL_THRESHOLD;
  const request = await prisma.redemptionRequest.create({
    data: {
      id: randomUUID(),
      userId,
      fundId: resolvedFundId,
      amount: amt,
      status: 'pending',
      reason: toTrimmedString(body.reason),
      requiresDualApproval: body.requiresDualApproval ?? requiresDualApproval,
      dualApprovalThresholdConfigVersion: body.dualApprovalThresholdConfigVersion ?? (requiresDualApproval ? 'default-500000' : null),
      approvals: body.approvals ?? [],
      metadata: {
        type: redemptionType,
        fundName: fund.name,
        reservedHoldingValue: amt,
        reservedHoldingUnits: reservedUnits,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return {
    id: request.id,
    userId: request.userId,
    fundId: request.fundId,
    fundName: fund.name,
    amount: Number(request.amount),
    type: redemptionType,
    status: request.status,
    reason: toTrimmedString(body.reason),
    requestedAt: request.createdAt.toISOString(),
    processedAt: null,
    processedBy: null,
    requiresDualApproval: request.requiresDualApproval,
    dualApprovalThresholdConfigVersion: request.dualApprovalThresholdConfigVersion,
    approvals: request.approvals,
    reservedHoldingValue: amt,
    reservedHoldingUnits: reservedUnits,
  };
}


export async function listRedemptionRequests(config: AppConfig, { status, userId, fundId }: any = {}) {
  const where: any = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;
  if (fundId) where.fundId = fundId;

  const items = await prisma.redemptionRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return { items, count: items.length };
}

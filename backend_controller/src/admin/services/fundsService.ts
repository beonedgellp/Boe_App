import type { FundBody, FundAllocationBody, RedemptionProcessBody, RequestContext } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import type { HoldingItem } from '#types/models.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';
import { withReceipt } from '#shared/services/withReceipt.js';
import {
  computeFundAge,
  computeFundAnalytics,
  toClientFund,
  toClientFunds,
  normalizePerformanceSeries,
  sanitizePerformancePeriods,
  sanitizePerformanceSummary,
  sanitizeAssetAllocation,
  sanitizeAdvancedRatios,
  sanitizeNav,
  sanitizeRating,
} from '#shared/services/fundClientView.js';

export { computeFundAge, computeFundAnalytics, toClientFund, toClientFunds };


function toNumber(value: any, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toTrimmedString(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function plainObject(value: any) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function buildChartConfig(incoming: any = {}, existing: any = {}) {
  const base = { ...existing, ...incoming };
  return {
    showSectorDistribution: base.showSectorDistribution !== false,
    showInvestmentBreakdown: base.showInvestmentBreakdown !== false,
    showCompanyNames: base.showCompanyNames !== false,
    showBenchmarkComparison: base.showBenchmarkComparison !== false,
    showAssetAllocation: base.showAssetAllocation !== false,
    showAdvancedRatios: base.showAdvancedRatios !== false,
  };
}

function buildFundDisplayFields(payload: any, existing: any = {}) {
  const has = (key: any) => payload[key] !== undefined;
  return {
    category: has('category') ? toTrimmedString(payload.category) : (existing.category ?? ''),
    subCategory: has('subCategory') ? toTrimmedString(payload.subCategory) : (existing.subCategory ?? ''),
    riskText: has('riskText') ? toTrimmedString(payload.riskText) : (existing.riskText ?? ''),
    holdingsAsOf: has('holdingsAsOf') ? toTrimmedString(payload.holdingsAsOf) : (existing.holdingsAsOf ?? ''),
    nav: has('nav') ? sanitizeNav(payload.nav) : (existing.nav ?? null),
    rating: has('rating') ? sanitizeRating(payload.rating) : (existing.rating ?? null),
    performanceSummary: has('performanceSummary')
      ? sanitizePerformanceSummary(payload.performanceSummary)
      : (existing.performanceSummary ?? null),
    performanceSeries: has('performanceSeries')
      ? normalizePerformanceSeries(payload.performanceSeries)
      : (existing.performanceSeries ?? []),
    performancePeriods: has('performancePeriods')
      ? sanitizePerformancePeriods(payload.performancePeriods)
      : (existing.performancePeriods ?? []),
    assetAllocation: has('assetAllocation')
      ? sanitizeAssetAllocation(payload.assetAllocation)
      : (existing.assetAllocation ?? []),
    advancedRatios: has('advancedRatios')
      ? sanitizeAdvancedRatios(payload.advancedRatios)
      : (existing.advancedRatios ?? {}),
  };
}


function fundTrackingId(id: string) {
  return `FP-${String(id).replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

const DUAL_APPROVAL_THRESHOLD = 500000;

function enrichFundWithAnalytics(fund: any) {
  const metadata = (fund.metadata as any) || {};
  const merged = { ...fund, ...metadata };
  const trackingId = metadata.trackingId || metadata.fundCode || fundTrackingId(fund.id);
  return { ...merged, trackingId, fundCode: trackingId, analytics: computeFundAnalytics(merged) };
}

export async function listFunds(config: AppConfig) {
  const items = await prisma.fund.findMany();
  const enriched = items.map(enrichFundWithAnalytics);
  return { items: enriched, count: enriched.length, source: 'prisma' };
}

export async function createFund(config: AppConfig, actor: Actor, body: FundBody, requestContext: RequestContext = {}) {
  const payload = body && typeof body === 'object' ? body : {};
  const name = toTrimmedString(payload.name);

  if (!name) {
    throw new HttpError(400, 'INVALID_FUND', 'Fund name is required.');
  }

  const fundId = randomUUID();
  const trackingId = fundTrackingId(fundId);
  const incomingChartConfig = plainObject(payload.chartConfig) ? payload.chartConfig : {};

  const metadata = {
    trackingId,
    fundCode: trackingId,
    tagline: toTrimmedString(payload.tagline),
    status: ['active', 'coming_soon'].includes(toTrimmedString(payload.status, 'coming_soon'))
      ? toTrimmedString(payload.status, 'coming_soon') : 'coming_soon',
    totalPoolSize: toNumber(payload.totalPoolSize, 0),
    initialInvestment: toNumber(payload.initialInvestment, 0),
    currentValue: toNumber(payload.currentValue, 0),
    launchDate: toTrimmedString(payload.launchDate),
    minDurationMonths: toNumber(payload.minDurationMonths, 0),
    lockInText: toTrimmedString(payload.lockInText),
    riskLabel: toTrimmedString(payload.riskLabel),
    sectors: Array.isArray(payload.sectors) ? payload.sectors : [],
    investments: Array.isArray(payload.investments) ? payload.investments : [],
    ...buildFundDisplayFields(payload),
    chartConfig: buildChartConfig(incomingChartConfig),
  };


  const lifecycleStage = ['draft', 'published', 'active', 'paused', 'closed', 'archived'].includes(payload.lifecycleStage as string)
    ? (payload.lifecycleStage as string) : 'draft';

  const fund = await prisma.$transaction(async (tx) => {
    const created = await tx.fund.create({
      data: {
        id: fundId,
        name,
        description: null,
        lifecycleStage,
        currency: 'INR',
        minSip: toNumber(payload.minSip, 0),
        minLumpsum: toNumber(payload.minLumpsum, 0),
        aumCash: 0,
        aumAllocated: 0,
        metadata: metadata as any,
        createdBy: actor?.userId || null,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: actor?.userId || null,
        action: 'fund.create',
        entityType: 'fund',
        entityId: fundId,
        beforeJson: null,
        afterJson: { ...created, ...metadata } as any,
        reason: (payload as any).reason || 'Admin created fund record.',
        ipAddress: requestContext.ipAddress || null,
        userAgent: typeof requestContext.userAgent === 'string' ? requestContext.userAgent : null,
      },
    });

    return created;
  });

  return enrichFundWithAnalytics(fund);
}

export async function getFund(config: AppConfig, fundId: string) {
  const fund = await prisma.fund.findFirst({ where: { id: fundId } });
  if (!fund) {
    throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);
  }
  return enrichFundWithAnalytics(fund);
}


export async function updateFund(config: AppConfig, actor: Actor, fundId: string, body: FundBody, requestContext: RequestContext = {}) {
  const payload = body && typeof body === 'object' ? body : {};

  const existing = await prisma.fund.findFirst({ where: { id: fundId } });
  if (!existing) throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);

  const existingMeta = (existing.metadata as any) || {};
  const now = new Date();
  const incomingChartConfig = payload.chartConfig !== undefined && plainObject(payload.chartConfig)
    ? payload.chartConfig : {};

  const rawStatus = toTrimmedString(payload.status, existingMeta.status);
  const status = ['active', 'coming_soon'].includes(rawStatus) ? rawStatus : existingMeta.status;

  const updatedMetadata = {
    ...existingMeta,
    ...buildFundDisplayFields(payload, existingMeta),
    tagline: payload.tagline !== undefined ? toTrimmedString(payload.tagline) : existingMeta.tagline,
    status,
    totalPoolSize: payload.totalPoolSize !== undefined ? toNumber(payload.totalPoolSize, existingMeta.totalPoolSize) : existingMeta.totalPoolSize,
    initialInvestment: payload.initialInvestment !== undefined ? toNumber(payload.initialInvestment, existingMeta.initialInvestment) : existingMeta.initialInvestment,
    currentValue: payload.currentValue !== undefined ? toNumber(payload.currentValue, existingMeta.currentValue) : existingMeta.currentValue,
    launchDate: payload.launchDate !== undefined ? toTrimmedString(payload.launchDate) : existingMeta.launchDate,
    minDurationMonths: payload.minDurationMonths !== undefined ? toNumber(payload.minDurationMonths, existingMeta.minDurationMonths) : existingMeta.minDurationMonths,
    lockInText: payload.lockInText !== undefined ? toTrimmedString(payload.lockInText) : existingMeta.lockInText,
    riskLabel: payload.riskLabel !== undefined ? toTrimmedString(payload.riskLabel) : existingMeta.riskLabel,
    sectors: payload.sectors !== undefined ? (Array.isArray(payload.sectors) ? payload.sectors : existingMeta.sectors) : existingMeta.sectors,
    investments: payload.investments !== undefined ? (Array.isArray(payload.investments) ? payload.investments : existingMeta.investments) : existingMeta.investments,
    chartConfig: buildChartConfig(incomingChartConfig, existingMeta.chartConfig || {}),
  };

  const lifecycleStage = payload.lifecycleStage !== undefined
    ? (['draft', 'published', 'active', 'paused', 'closed', 'archived'].includes(payload.lifecycleStage as string)
        ? (payload.lifecycleStage as string) : existing.lifecycleStage)
    : existing.lifecycleStage;


  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.fund.update({
      where: { id: fundId },
      data: {
        name: payload.name !== undefined ? toTrimmedString(payload.name, existing.name) : existing.name,
        lifecycleStage,
        minSip: payload.minSip !== undefined ? toNumber(payload.minSip, Number(existing.minSip)) : existing.minSip,
        minLumpsum: payload.minLumpsum !== undefined ? toNumber(payload.minLumpsum, Number(existing.minLumpsum)) : existing.minLumpsum,
        metadata: updatedMetadata as any,
        updatedAt: now,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: actor?.userId || null,
        action: 'fund.update',
        entityType: 'fund',
        entityId: fundId,
        beforeJson: { ...existing, ...existingMeta } as any,
        afterJson: { ...result, ...updatedMetadata } as any,
        reason: (payload as any).reason || 'Admin updated fund record.',
        ipAddress: requestContext.ipAddress || null,
        userAgent: typeof requestContext.userAgent === 'string' ? requestContext.userAgent : null,
      },
    });

    return result;
  });

  return enrichFundWithAnalytics(updated);
}

export async function deleteFund(config: AppConfig, actor: Actor, fundId: string, requestContext: RequestContext = {}) {
  const existing = await prisma.fund.findFirst({ where: { id: fundId } });
  if (!existing) throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);

  await prisma.$transaction(async (tx) => {
    await tx.fund.delete({ where: { id: fundId } });

    await tx.adminAuditLog.create({
      data: {
        adminId: actor?.userId || null,
        action: 'fund.delete',
        entityType: 'fund',
        entityId: fundId,
        beforeJson: existing as any,
        afterJson: null,
        reason: 'Admin deleted fund record.',
        ipAddress: requestContext.ipAddress || null,
        userAgent: typeof requestContext.userAgent === 'string' ? requestContext.userAgent : null,
      },
    });
  });

  return enrichFundWithAnalytics(existing);
}


/* -------------------------------------------------------------------------- */
/* Capital Flow & Allocation Management                                       */
/* -------------------------------------------------------------------------- */

export async function allocateFunds(config: AppConfig, actor: Actor, fundId: string, body: FundBody, requestContext: RequestContext = {}) {
  const { investmentId, amount, reason } = body || {};
  const amt = toNumber(amount, 0);

  if (!investmentId) throw new HttpError(400, 'INVALID_REQUEST', 'Investment ID is required.');
  if (amt <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0.');

  const fund = await prisma.fund.findFirst({ where: { id: fundId } });
  if (!fund) throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);

  const metadata = (fund.metadata as any) || {};
  const analytics = computeFundAnalytics({ ...fund, ...metadata })!;
  const cash = (Number(metadata.totalPoolSize) || 0) - analytics.totalInvested;
  if (amt > cash) {
    throw new HttpError(400, 'INSUFFICIENT_CASH', 'Not enough unallocated cash for this allocation.');
  }

  const investments = metadata.investments || [];
  const inv = investments.find((i: any) => i.id === investmentId);
  if (!inv) throw new HttpError(404, 'INVESTMENT_NOT_FOUND', 'Investment not found.');

  inv.amount = (Number(inv.amount) || 0) + amt;
  const updatedMetadata = { ...metadata, investments };

  await prisma.$transaction(async (tx) => {
    await tx.fund.update({
      where: { id: fundId },
      data: { metadata: updatedMetadata as any, updatedAt: new Date() },
    });

    await tx.capitalTransaction.create({
      data: {
        fundId,
        type: 'allocation',
        amount: amt,
        reason: toTrimmedString(reason, 'Fund allocation'),
        actorAdminId: actor?.userId || null,
        metadata: { source: 'cash', target: inv.companyName || investmentId } as any,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: actor?.userId || null,
        action: 'fund.allocate',
        entityType: 'fund',
        entityId: fundId,
        beforeJson: { investmentAmount: inv.amount - amt } as any,
        afterJson: { investmentAmount: inv.amount } as any,
        reason: toTrimmedString(reason, 'Fund allocation'),
        ipAddress: requestContext.ipAddress || null,
        userAgent: typeof requestContext.userAgent === 'string' ? requestContext.userAgent : null,
      },
    });
  });

  const updated = await prisma.fund.findFirst({ where: { id: fundId } });
  return enrichFundWithAnalytics(updated);
}


export async function unallocateFunds(config: AppConfig, actor: Actor, fundId: string, body: FundBody, requestContext: RequestContext = {}) {
  const { investmentId, amount, reason } = body || {};
  const amt = toNumber(amount, 0);

  if (!investmentId) throw new HttpError(400, 'INVALID_REQUEST', 'Investment ID is required.');
  if (amt <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0.');

  const fund = await prisma.fund.findFirst({ where: { id: fundId } });
  if (!fund) throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);

  const metadata = (fund.metadata as any) || {};
  const investments = metadata.investments || [];
  const inv = investments.find((i: any) => i.id === investmentId);
  if (!inv) throw new HttpError(404, 'INVESTMENT_NOT_FOUND', 'Investment not found.');

  const currentAmount = Number(inv.amount) || 0;
  if (amt > currentAmount) {
    throw new HttpError(400, 'OVER_WITHDRAWAL', `Cannot unallocate ₹${amt}. Investment only has ₹${currentAmount}.`);
  }

  inv.amount = currentAmount - amt;
  const updatedMetadata = { ...metadata, investments };

  await prisma.$transaction(async (tx) => {
    await tx.fund.update({
      where: { id: fundId },
      data: { metadata: updatedMetadata as any, updatedAt: new Date() },
    });

    await tx.capitalTransaction.create({
      data: {
        fundId,
        type: 'unallocation',
        amount: amt,
        reason: toTrimmedString(reason, 'Fund unallocation'),
        actorAdminId: actor?.userId || null,
        metadata: { source: inv.companyName || investmentId, target: 'cash' } as any,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: actor?.userId || null,
        action: 'fund.unallocate',
        entityType: 'fund',
        entityId: fundId,
        beforeJson: { investmentAmount: currentAmount } as any,
        afterJson: { investmentAmount: inv.amount } as any,
        reason: toTrimmedString(reason, 'Fund unallocation'),
        ipAddress: requestContext.ipAddress || null,
        userAgent: typeof requestContext.userAgent === 'string' ? requestContext.userAgent : null,
      },
    });
  });

  const updated = await prisma.fund.findFirst({ where: { id: fundId } });
  return enrichFundWithAnalytics(updated);
}


export async function adminOutflow(config: AppConfig, actor: Actor, fundId: string, body: FundBody, requestContext: RequestContext = {}) {
  const { amount, reason } = body || {};
  const amt = toNumber(amount, 0);

  if (amt <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0.');
  if (!toTrimmedString(reason)) throw new HttpError(400, 'REASON_REQUIRED', 'Reason is required for withdrawals.');

  const fund = await prisma.fund.findFirst({ where: { id: fundId } });
  if (!fund) throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);

  const metadata = (fund.metadata as any) || {};
  const totalPoolSize = Number(metadata.totalPoolSize) || 0;
  if (amt > totalPoolSize) {
    throw new HttpError(400, 'OVER_WITHDRAWAL', `Cannot withdraw ₹${amt}. Pool size is only ₹${totalPoolSize}.`);
  }

  const analytics = computeFundAnalytics({ ...fund, ...metadata })!;
  const cash = totalPoolSize - analytics.totalInvested;
  const investments = metadata.investments || [];

  let remaining = amt;
  if (cash >= remaining) {
    remaining = 0;
  } else {
    remaining -= cash;
    const totalInv = analytics.totalInvested;
    if (totalInv > 0 && remaining > 0) {
      for (const inv of investments) {
        const invAmt = Number(inv.amount) || 0;
        if (invAmt <= 0) continue;
        const reduction = Math.min(invAmt, Math.round((invAmt / totalInv) * remaining));
        inv.amount = invAmt - reduction;
        remaining -= reduction;
        if (remaining <= 0) break;
      }
    }
  }

  const newPoolSize = Math.max(0, totalPoolSize - amt);
  const updatedMetadata = { ...metadata, totalPoolSize: newPoolSize, investments };

  await prisma.$transaction(async (tx) => {
    await tx.fund.update({
      where: { id: fundId },
      data: { metadata: updatedMetadata as any, updatedAt: new Date() },
    });

    await tx.capitalTransaction.create({
      data: {
        fundId,
        type: 'outflow',
        amount: amt,
        reason: toTrimmedString(reason),
        actorAdminId: actor?.userId || null,
        metadata: { source: 'pool', target: 'external' } as any,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: actor?.userId || null,
        action: 'fund.outflow',
        entityType: 'fund',
        entityId: fundId,
        beforeJson: { totalPoolSize } as any,
        afterJson: { totalPoolSize: newPoolSize } as any,
        reason: toTrimmedString(reason),
        ipAddress: requestContext.ipAddress || null,
        userAgent: typeof requestContext.userAgent === 'string' ? requestContext.userAgent : null,
      },
    });
  });

  const updated = await prisma.fund.findFirst({ where: { id: fundId } });
  return enrichFundWithAnalytics(updated);
}


export async function adminInflow(config: AppConfig, actor: Actor, fundId: string, body: FundBody, requestContext: RequestContext = {}) {
  const { amount, reason } = body || {};
  const amt = toNumber(amount, 0);

  if (amt <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0.');

  const fund = await prisma.fund.findFirst({ where: { id: fundId } });
  if (!fund) throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);

  const metadata = (fund.metadata as any) || {};
  const totalPoolSize = (Number(metadata.totalPoolSize) || 0) + amt;
  const updatedMetadata = { ...metadata, totalPoolSize };

  await prisma.$transaction(async (tx) => {
    await tx.fund.update({
      where: { id: fundId },
      data: { metadata: updatedMetadata as any, updatedAt: new Date() },
    });

    await tx.capitalTransaction.create({
      data: {
        fundId,
        type: 'inflow',
        amount: amt,
        reason: toTrimmedString(reason, 'Capital inflow'),
        actorAdminId: actor?.userId || null,
        metadata: { source: 'external', target: 'pool' } as any,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: actor?.userId || null,
        action: 'fund.inflow',
        entityType: 'fund',
        entityId: fundId,
        beforeJson: { totalPoolSize: totalPoolSize - amt } as any,
        afterJson: { totalPoolSize } as any,
        reason: toTrimmedString(reason, 'Capital inflow'),
        ipAddress: requestContext.ipAddress || null,
        userAgent: typeof requestContext.userAgent === 'string' ? requestContext.userAgent : null,
      },
    });
  });

  const updated = await prisma.fund.findFirst({ where: { id: fundId } });
  return enrichFundWithAnalytics(updated);
}


/* -------------------------------------------------------------------------- */
/* Redemption Requests (User withdrawals)                                     */
/* -------------------------------------------------------------------------- */

export async function createRedemptionRequest(config: AppConfig, userId: string, body: FundAllocationBody) {
  const { fundId, amount, type, holdingId } = body || {};
  const amt = toNumber(amount, 0);

  if (!fundId && !holdingId) throw new HttpError(400, 'INVALID_REQUEST', 'Fund ID or Holding ID is required.');
  if (amt <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0.');

  let resolvedFundId = fundId;
  let holding: HoldingItem | null = null;

  // Look up portfolio snapshot for holdings
  const snapshot = await prisma.portfolioSnapshot.findFirst({
    where: { userId },
    orderBy: { asOfDate: 'desc' },
  });
  const portfolioPayload = (snapshot?.payload as any) || { holdings: [] };
  const holdings: HoldingItem[] = portfolioPayload.holdings || [];

  if (holdingId && !resolvedFundId) {
    holding = holdings.find((h: HoldingItem) => (h.id || h.fundId) === holdingId) || null;
    if (!holding) throw new HttpError(404, 'HOLDING_NOT_FOUND', 'Holding not found.');
    resolvedFundId = holding.fundId;
  }

  const fund = await prisma.fund.findFirst({ where: { id: resolvedFundId } });
  if (!fund) throw new HttpError(404, 'FUND_NOT_FOUND', 'Fund not found.');

  if (!holding) {
    holding = holdings.find((h: HoldingItem) => h.fundId === resolvedFundId) || null;
  }
  if (!holding) throw new HttpError(404, 'HOLDING_NOT_FOUND', 'Holding not found.');

  const holdingValue = toNumber(holding.currentValue, 0);
  if (amt > holdingValue + 0.001) {
    throw new HttpError(400, 'INSUFFICIENT_HOLDINGS', `Insufficient holdings. Available: ₹${holdingValue}, requested: ₹${amt}.`);
  }

  const fundMinSip = Number(fund.minSip) || 0;
  if (amt < fundMinSip) {
    throw new HttpError(400, 'BELOW_MINIMUM', `Minimum redemption is ₹${fundMinSip}.`);
  }

  const redemptionType = type || (amt >= holdingValue - 0.001 ? 'full' : 'partial');
  if (!['full', 'partial'].includes(redemptionType)) throw new HttpError(400, 'INVALID_TYPE', 'Type must be full or partial.');

  // Compute reserved units
  const oldValue = holdingValue;
  const oldUnits = toNumber(holding.units, 0);
  const reservedUnits = oldValue > 0 ? oldUnits * (amt / oldValue) : 0;

  const requiresDualApproval = body.requiresDualApproval ?? (amt > DUAL_APPROVAL_THRESHOLD);

  const request = await prisma.redemptionRequest.create({
    data: {
      userId,
      fundId: resolvedFundId,
      amount: amt,
      status: 'pending',
      reason: toTrimmedString(body.reason),
      requiresDualApproval,
      dualApprovalThresholdConfigVersion: body.dualApprovalThresholdConfigVersion ?? (requiresDualApproval ? 'default-500000' : null),
      approvals: (body.approvals ?? []) as any,
      metadata: {
        fundName: fund.name,
        type: redemptionType,
        reservedHoldingValue: amt,
        reservedHoldingUnits: reservedUnits,
      } as any,
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
    reason: request.reason,
    requiresDualApproval: request.requiresDualApproval,
    requestedAt: request.createdAt.toISOString(),
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

async function _processRedemptionRequest(config: AppConfig, actor: Actor, requestId: string, body: FundBody, requestContext: RequestContext = {}) {
  const { action, reason } = body || {};
  if (!['approved', 'rejected'].includes(action as string)) {
    throw new HttpError(400, 'INVALID_ACTION', 'Action must be approved or rejected.');
  }

  const req = await prisma.redemptionRequest.findFirst({ where: { id: requestId } });
  if (!req) throw new HttpError(404, 'REQUEST_NOT_FOUND', `Redemption request ${requestId} not found.`);

  if (req.status !== 'pending') {
    throw new HttpError(400, 'ALREADY_PROCESSED', `Request already ${req.status}.`);
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    await tx.redemptionRequest.update({
      where: { id: requestId },
      data: {
        status: action as string,
        metadata: {
          ...((req.metadata as any) || {}),
          processedAt: now.toISOString(),
          processedBy: actor?.userId || null,
          adminReason: toTrimmedString(reason),
        } as any,
        updatedAt: now,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: actor?.userId || null,
        action: `redemption.${action}`,
        entityType: 'redemption',
        entityId: requestId,
        beforeJson: { status: 'pending' } as any,
        afterJson: { status: action, amount: Number(req.amount) } as any,
        reason: toTrimmedString(reason, `Redemption ${action}`),
        ipAddress: requestContext.ipAddress || null,
        userAgent: typeof requestContext.userAgent === 'string' ? requestContext.userAgent : null,
      },
    });

    return {
      id: req.id,
      userId: req.userId,
      fundId: req.fundId,
      amount: Number(req.amount),
      status: action,
      reason: req.reason,
    };
  });

  return result;
}

export const processRedemptionRequest = withReceipt(_processRedemptionRequest, 'redemption_processed', {
  entityType: 'redemption',
  entityId: (result: Record<string, unknown>) => result.id,
  afterState: (result: Record<string, unknown>) => result.status,
  subjectUserId: (result: Record<string, unknown>) => result.userId,
  amount: (result: Record<string, unknown>) => result.amount,
  source: 'derived',
});

export async function listCapitalTransactions(config: AppConfig, { fundId, type, limit = 50 }: any = {}) {
  const where: any = {};
  if (fundId) where.fundId = fundId;
  if (type) where.type = type;

  const items = await prisma.capitalTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return { items, count: items.length };
}

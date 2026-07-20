import type { AdminUserFilters, AdminTransactionFilters, AdminPaymentFilters, UpdateUserStatusBody, RequestContext } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import type { FundRow } from '#types/models.js';
import { randomUUID } from 'node:crypto';
import { emptyCollection } from '#shared/services/placeholderService.js';
import { getPublishedAppConfig } from '#shared/services/appConfigService.js';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';
import { notifyUserApproved, notifyUserRejected } from './notificationComposerService.js';

const PENDING_APPROVAL_STATUSES = new Set(['draft', 'pending_review', 'kyc_pending']);


function visibleTransactionType(type: any) {
  const value = String(type || '').toLowerCase();
  if (value === 'sip' || value === 'sip_installment' || value === 'installment') return 'sip';
  if (value === 'lumpsum' || value === 'one_time' || value === 'one-time') return 'lumpsum';
  return value;
}

function displayName(user: any) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Client';
}

function userPayload(user: any) {
  return {
    id: user.id,
    name: displayName(user),
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || 'client',
    status: user.status || 'approved',
    approvalRef: user.approvalRef || '',
    riskProfileStatus: user.riskProfileStatus || 'approved',
    kycStatus: user.kycStatus || 'approved',
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : (user.createdAt || ''),
    approvedAt: user.approvedAt instanceof Date ? user.approvedAt.toISOString() : (user.approvedAt || ''),
  };
}

function collection(items: any, source = 'prisma') {
  return {
    items,
    count: items.length,
    source,
  };
}

function emptyForActiveStore(config: AppConfig) {
  return emptyCollection({ source: `${config.dataStore}_pending` });
}

function computeAutopaySuccess(mandates: any) {
  if (!Array.isArray(mandates) || mandates.length === 0) return 'N/A';
  const successStatuses = new Set(['active', 'success', 'confirmed']);
  const successCount = mandates.filter((m: any) => successStatuses.has(m.status)).length;
  return `${Math.round((successCount / mandates.length) * 100)}%`;
}

function pendingApproval(user: any) {
  return (user.role || 'client') === 'client' && PENDING_APPROVAL_STATUSES.has(user.status);
}


export async function adminOverview(config: AppConfig) {
  const users = await prisma.user.findMany({
    select: { role: true, status: true, kycStatus: true },
  });

  const pendingApprovals = users.filter(pendingApproval);
  const kyc = users.filter((user) => user.role === 'client' && user.kycStatus && user.kycStatus !== 'approved');
  const rejected = users.filter((user) => user.role === 'client' && user.status === 'rejected');
  const approved = users.filter((user) => user.role === 'client' && user.status === 'approved');

  return {
    source: 'prisma',
    counts: {
      approvals: pendingApprovals.length,
      kyc: kyc.length,
      requests: 0,
      users: users.length,
      products: 0,
      payments: 0,
      mandates: 0,
      support: 0,
      audit: 0,
    },
    stats: {
      pendingApprovals: pendingApprovals.length,
      approvedThisWeek: approved.length,
      rejectedThisWeek: rejected.length,
      avgReviewTime: '0h',
      paymentsProcessedToday: 0,
      pendingPayments: 0,
      failedPayments: 0,
      reconciledPayments: 0,
      activeMandates: 0,
      pendingMandates: 0,
      pausedMandates: 0,
      autopaySuccess: computeAutopaySuccess([]),
    },
  };
}

export async function adminUsers(config: AppConfig, { status = 'approved', q, page = 1, limit = 25 }: AdminUserFilters = {}) {
  const where: any = { role: 'client' };
  if (status) where.status = status;

  const allUsers = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  let users = allUsers.map(userPayload);

  if (q) {
    const lowerQ = q.toLowerCase();
    users = users.filter((u) =>
      u.name.toLowerCase().includes(lowerQ) ||
      u.email.toLowerCase().includes(lowerQ)
    );
  }

  const total = users.length;
  const start = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
  const end = start + Math.max(1, Number(limit));
  const paginated = users.slice(start, end);

  return {
    items: paginated,
    count: paginated.length,
    total,
    page: Number(page),
    limit: Number(limit),
    source: 'prisma',
  };
}


export async function adminTransactions(config: AppConfig, { fundId, status, type, userId, q, page = 1, limit = 25 }: AdminTransactionFilters = {}) {
  const where: any = {};
  if (fundId) where.productId = fundId;
  if (status) where.status = status;
  if (userId) where.userId = userId;

  const normalizedType = visibleTransactionType(type);
  if (normalizedType === 'sip') {
    where.type = { in: ['sip_installment'] };
  } else if (normalizedType === 'lumpsum') {
    where.type = { in: ['one_time_investment'] };
  } else if (type) {
    where.type = type;
  }

  const rawTransactions = await prisma.transaction.findMany({
    where,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Also load fund names
  const productIds = [...new Set(rawTransactions.map((t) => t.productId).filter(Boolean))];
  const funds = productIds.length > 0
    ? await prisma.fund.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const fundMap = new Map(funds.map((f) => [f.id, f.name]));

  let transactions = rawTransactions.map((row) => ({
    id: row.id,
    userId: row.userId,
    productId: row.productId,
    investmentPlanId: row.investmentPlanId,
    type: row.type,
    amount: row.amount,
    date: row.requestedAt?.toISOString() || '',
    nav: row.nav,
    units: row.units,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    requestedAt: row.requestedAt?.toISOString() || '',
    paymentConfirmedAt: row.paymentConfirmedAt?.toISOString() || null,
    allottedAt: row.allottedAt?.toISOString() || null,
    cancelledAt: row.cancelledAt?.toISOString() || null,
    createdAt: row.createdAt?.toISOString() || '',
    updatedAt: row.updatedAt?.toISOString() || '',
    userName: [row.user?.firstName, row.user?.lastName].filter(Boolean).join(' ') || row.user?.email || row.userId,
    userEmail: row.user?.email || '',
    fundName: fundMap.get(row.productId) || row.productId || '—',
  }));

  if (q) {
    const lowerQ = q.toLowerCase();
    transactions = transactions.filter((tx) =>
      tx.userName.toLowerCase().includes(lowerQ) ||
      tx.userEmail.toLowerCase().includes(lowerQ) ||
      tx.fundName.toLowerCase().includes(lowerQ) ||
      tx.id.toLowerCase().includes(lowerQ)
    );
  }

  const total = transactions.length;
  const start = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
  const end = start + Math.max(1, Number(limit));
  const paginated = transactions.slice(start, end);

  return {
    items: paginated,
    count: paginated.length,
    total,
    page: Number(page),
    limit: Number(limit),
    source: 'prisma',
  };
}


export async function adminApprovals(config: AppConfig, status = 'pending') {
  const where: any = { role: 'client' };

  if (status === 'pending') {
    where.status = { in: ['draft', 'pending_review', 'kyc_pending'] };
  } else if (status === 'rejected') {
    where.status = 'rejected';
  } else if (status === 'approved') {
    where.status = 'approved';
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return collection(users.map(userPayload));
}

export async function adminKycReview(config: AppConfig) {
  const users = await prisma.user.findMany({
    where: { role: 'client', kycStatus: { not: 'approved' } },
    include: { kycProfile: true },
    orderBy: { createdAt: 'desc' },
  });

  const items = users.map((user) => {
    const kyc = user.kycProfile;
    return {
      ...userPayload(user),
      panLast4: kyc?.panLast4 || '',
      aadhaarLast4: kyc?.aadhaarLast4 || '',
      kycReviewStatus: kyc?.reviewStatus || 'not_started',
      kycAdminNotes: kyc?.adminNotes || '',
      kycReviewedAt: kyc?.reviewedAt?.toISOString() || '',
      kycReviewedBy: kyc?.reviewedBy || '',
      kycAddress: kyc?.addressJson || {},
      kycDocuments: kyc?.documentRefsJson || [],
    };
  });

  return collection(items);
}

export async function adminRiskProfiles(config: AppConfig) {
  const users = await prisma.user.findMany({
    where: { role: 'client' },
    include: { riskProfile: true },
    orderBy: { createdAt: 'desc' },
  });

  const items = users.map((user) => {
    const rp = user.riskProfile;
    return {
      ...userPayload(user),
      ageBand: rp?.ageBand || '',
      investmentHorizon: rp?.investmentHorizon || '',
      incomeBand: rp?.incomeBand || '',
      lossTolerance: rp?.lossTolerance || '',
      investmentExperience: rp?.investmentExperience || '',
      riskCompletedAt: rp?.completedAt?.toISOString() || '',
      riskAnswers: rp?.answersJson || {},
    };
  });

  return collection(items);
}

export async function adminStrategies(config: AppConfig) {
  try {
    const appConfig = await getPublishedAppConfig(config);
    return collection(appConfig.config?.mobile?.products || [], appConfig.source || config.dataStore);
  } catch {
    return emptyForActiveStore(config);
  }
}


export async function adminPayments(config: AppConfig, filters: AdminPaymentFilters = {}) {
  const queryText = String(filters.q || '').trim().toLowerCase();
  const status = String(filters.status || '').trim();
  const fundId = String(filters.fundId || '').trim();
  const userId = String(filters.userId || '').trim();
  const provider = String(filters.provider || '').trim();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize || filters.limit) || 100));

  const where: any = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;
  if (provider) where.provider = provider;

  const payments = await prisma.payment.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      transaction: {
        select: { id: true, productId: true, investmentPlanId: true, type: true, status: true, amount: true, requestedAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Load funds for enrichment
  const productIds = [...new Set(payments.map((p) => p.transaction?.productId).filter(Boolean))] as string[];
  const funds = productIds.length > 0
    ? await prisma.fund.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const fundMap = new Map(funds.map((f) => [f.id, f.name]));

  let items = payments.map((payment) => {
    const user = payment.user;
    const transaction = payment.transaction;
    const pFundId = transaction?.productId || fundId || null;
    const name = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '' : '';
    const time = payment.createdAt?.toISOString() || '';

    return {
      id: payment.id,
      paymentId: payment.id,
      userId: payment.userId,
      user: name,
      userName: name,
      userEmail: user?.email || '',
      amount: Number(payment.amount),
      mode: payment.mode || '',
      provider: payment.provider || '',
      status: payment.status || 'unknown',
      time,
      createdAt: time,
      transactionId: payment.transactionId || null,
      transactionStatus: transaction?.status || null,
      transactionType: transaction?.type || null,
      fundId: pFundId,
      fundName: pFundId ? (fundMap.get(pFundId) || pFundId) : 'Unmapped fund',
      providerPaymentId: payment.providerPaymentId || null,
    };
  });

  if (fundId) items = items.filter((row) => row.fundId === fundId);
  if (queryText) {
    items = items.filter((row) => [
      row.id, row.userName, row.userEmail, row.fundName, row.providerPaymentId, row.transactionId,
    ].some((v) => String(v || '').toLowerCase().includes(queryText)));
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  const pagedItems = items.slice(start, start + pageSize);

  return {
    items: pagedItems,
    count: pagedItems.length,
    total,
    page,
    pageSize,
    source: 'prisma',
  };
}


export async function adminMandates(config: AppConfig) {
  const items = await prisma.mandate.findMany({ orderBy: { createdAt: 'desc' } });
  return collection(items);
}

export async function adminSipControlRequests(config: AppConfig) {
  const items = await prisma.sipControlRequest.findMany({
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Load plans and funds for enrichment
  const planIds = [...new Set(items.map((r) => r.planId).filter(Boolean))] as string[];
  const plans = planIds.length > 0
    ? await prisma.investmentPlan.findMany({ where: { id: { in: planIds } }, select: { id: true, productId: true, amount: true } })
    : [];
  const planMap = new Map(plans.map((p) => [p.id, p]));
  const productIds = [...new Set(plans.map((p) => p.productId).filter(Boolean))];
  const funds = productIds.length > 0
    ? await prisma.fund.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const fundMap = new Map(funds.map((f) => [f.id, f.name]));

  const mapped = items.map((req) => {
    const plan = req.planId ? planMap.get(req.planId) : null;
    const fundName = plan ? (fundMap.get(plan.productId) || plan.productId) : '—';
    return {
      id: req.id,
      userId: req.userId,
      planId: req.planId,
      action: req.action,
      reason: req.reason,
      status: req.status,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
      userName: req.user ? [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.email || req.userId : req.userId,
      userEmail: req.user?.email || '',
      fundName,
      amount: plan?.amount ?? null,
    };
  });

  return collection(mapped);
}

export async function adminSupportTickets(config: AppConfig) {
  const items = await prisma.supportTicket.findMany({ orderBy: { createdAt: 'desc' } });
  return collection(items);
}

export async function adminFunds(config: AppConfig) {
  const items = await prisma.fund.findMany({ orderBy: { createdAt: 'desc' } });
  return collection(items);
}

export async function adminAuditLogs(config: AppConfig) {
  const items = await prisma.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' } });
  return collection(items);
}

export async function adminPendingStats(config: AppConfig) {
  const count = await prisma.user.count({
    where: {
      role: 'client',
      status: { in: ['draft', 'pending_review', 'kyc_pending'] },
    },
  });
  return { pendingCount: count, source: 'prisma' };
}


export async function updateUserStatus(config: AppConfig, actor: Actor, userId: string, body: UpdateUserStatusBody = {}, metadata: RequestContext = {}) {
  const nextStatus = String(body.status || '').trim();
  if (!['pending_review', 'approved', 'rejected', 'suspended', 'closed'].includes(nextStatus)) {
    throw new HttpError(400, 'INVALID_USER_STATUS', 'Unsupported user status.');
  }

  const reason = String(body.reason || '').trim() || null;

  if (nextStatus === 'rejected' && !reason) {
    throw new HttpError(400, 'REASON_REQUIRED', 'A rejection reason is required.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const beforeUser = await tx.user.findFirst({ where: { id: userId } });
    if (!beforeUser) return null;
    if (beforeUser.role !== 'client') {
      throw new HttpError(400, 'ADMIN_USER_STATUS_FORBIDDEN', 'Only client users can be updated from this queue.');
    }

    const updateData: any = {
      status: nextStatus as any,
      updatedAt: new Date(),
    };

    if (nextStatus === 'approved') {
      updateData.approvedAt = new Date();
      if (beforeUser.riskProfileStatus === 'pending') {
        updateData.riskProfileStatus = 'approved';
      }
      if (beforeUser.kycStatus === 'pending') {
        updateData.kycStatus = 'approved';
      }
    } else if (nextStatus === 'rejected') {
      updateData.rejectedAt = new Date();
    } else if (nextStatus === 'suspended') {
      updateData.suspendedAt = new Date();
    } else if (nextStatus === 'closed') {
      updateData.closedAt = new Date();
    }

    const afterUser = await tx.user.update({
      where: { id: userId },
      data: updateData,
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: actor?.userId || null,
        action: 'user.status.update',
        entityType: 'users',
        entityId: userId,
        beforeJson: userPayload(beforeUser) as any,
        afterJson: userPayload(afterUser) as any,
        reason,
        ipAddress: metadata.ipAddress || null,
        userAgent: typeof metadata.userAgent === 'string' ? metadata.userAgent : null,
      },
    });

    return userPayload(afterUser);
  });

  if (!updated) throw new HttpError(404, 'USER_NOT_FOUND', 'User was not found.');

  if (nextStatus === 'approved') {
    await notifyUserApproved(config, userId, updated.name);
  } else if (nextStatus === 'rejected') {
    await notifyUserRejected(config, userId, updated.name, reason);
  }

  const stats = await adminPendingStats(config);
  return { user: updated, pendingCount: stats.pendingCount };
}

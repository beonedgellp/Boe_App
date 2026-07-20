import type { AppConfig, Actor } from '#types/index.js';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';

interface BlockingReason {
  code: string;
  label: string;
}

interface BlockingUser {
  kycStatus: string;
  riskProfileStatus: string;
  status: string;
}

function computeBlockingReasons(
  user: BlockingUser,
  kycProfile: { reviewStatus: string } | null,
): BlockingReason[] {
  const reasons: BlockingReason[] = [];
  if (user.kycStatus === 'rejected' || (kycProfile && kycProfile.reviewStatus === 'rejected')) {
    reasons.push({ code: 'kyc_rejected', label: 'KYC rejected' });
  } else if (user.kycStatus !== 'approved' || (kycProfile && kycProfile.reviewStatus !== 'approved')) {
    reasons.push({ code: 'kyc_pending', label: 'KYC pending' });
  }
  if (user.riskProfileStatus === 'rejected') {
    reasons.push({ code: 'risk_profile_rejected', label: 'Risk profile rejected' });
  } else if (user.riskProfileStatus !== 'approved') {
    reasons.push({ code: 'risk_profile_not_approved', label: 'Risk profile not approved' });
  }
  if (user.status === 'suspended') {
    reasons.push({ code: 'account_suspended', label: 'Account suspended' });
  }
  if (user.status === 'rejected') {
    reasons.push({ code: 'account_rejected', label: 'Account rejected' });
  }
  if (user.status === 'pending_review' || user.status === 'pending_approval') {
    reasons.push({ code: 'account_pending_approval', label: 'Account pending approval' });
  }
  return reasons;
}

export async function getUserDetail(config: AppConfig, actor: Actor, userId: string) {
  const record = await prisma.user.findUnique({
    where: { id: userId },
    include: { kycProfile: true, riskProfile: true },
  });

  if (!record) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  const user = {
    id: record.id,
    firstName: record.firstName,
    lastName: record.lastName,
    name: [record.firstName, record.lastName].filter(Boolean).join(' ') || record.email || 'Client',
    email: record.email || '',
    phone: record.phone || '',
    role: record.role || 'client',
    status: record.status || 'approved',
    approvalRef: '',
    riskProfileStatus: record.riskProfileStatus || 'approved',
    kycStatus: record.kycStatus || 'approved',
    createdAt: record.createdAt || '',
    approvedAt: record.approvedAt || '',
    updatedAt: record.updatedAt || '',
    rejectedAt: record.rejectedAt || '',
    suspendedAt: record.suspendedAt || '',
    closedAt: record.closedAt || '',
  };

  const kyc = record.kycProfile;
  const kycProfile = kyc
    ? {
        id: kyc.id,
        userId: record.id,
        panLast4: kyc.panLast4 || '',
        aadhaarLast4: kyc.aadhaarLast4 || '',
        reviewStatus: kyc.reviewStatus || 'not_started',
        adminNotes: kyc.adminNotes || '',
        reviewedAt: kyc.reviewedAt || '',
        reviewedBy: kyc.reviewedBy || '',
        address: kyc.addressJson || {},
        documentRefs: kyc.documentRefsJson || [],
      }
    : null;

  const [investmentPlans, payments, mandates, transactions] = await Promise.all([
    prisma.investmentPlan.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.mandate.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
  ]);

  const paymentIds = new Set(payments.map((p) => p.id));
  const mandateIds = new Set(mandates.map((m) => m.id));
  const planIds = new Set(investmentPlans.map((p) => p.id));
  const txIds = new Set(transactions.map((t) => t.id));
  const kycProfileId = kycProfile?.id || null;

  const allEntityIds = [
    userId,
    ...paymentIds,
    ...mandateIds,
    ...planIds,
    ...txIds,
    ...(kycProfileId ? [kycProfileId] : []),
  ];

  const auditRows = await prisma.adminAuditLog.findMany({
    where: { entityId: { in: allEntityIds } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const auditLogs = auditRows.filter((log) => {
    if (log.entityType === 'users' && log.entityId === userId) return true;
    if (log.entityType === 'payment') return log.entityId !== null && paymentIds.has(log.entityId);
    if (log.entityType === 'mandate') return log.entityId !== null && mandateIds.has(log.entityId);
    if (log.entityType === 'investment_plan') return log.entityId !== null && planIds.has(log.entityId);
    if (log.entityType === 'transaction') return log.entityId !== null && txIds.has(log.entityId);
    if (log.entityType === 'kyc_profile') return log.entityId === kycProfileId;
    return false;
  });

  return {
    user,
    kycProfile,
    blockingReasons: computeBlockingReasons(user, kycProfile),
    investmentPlans,
    payments,
    mandates,
    redemptionRequests: [],
    sipControlRequests: [],
    supportTickets: [],
    notifications: [],
    auditLogs,
    portfolio: null,
  };
}

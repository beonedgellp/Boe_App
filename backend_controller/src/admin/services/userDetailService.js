import { HttpError } from '#http/errors.js';
import { query } from '#db/client.js';
import { jsonStoreEnabled, readJsonStore } from '#db/jsonStore.js';

function computeBlockingReasons(user, kycProfile) {
  const reasons = [];
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

function recentItems(items, limit = 20) {
  return [...items]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, limit);
}

function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

export async function getUserDetail(config, actor, userId) {
  if (!jsonStoreEnabled(config)) {
    const userResult = await query(config, `
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role::text, u.status::text,
             u.risk_profile_status::text, u.kyc_status::text, u.created_at, u.approved_at,
             u.updated_at, u.rejected_at, u.suspended_at, u.closed_at, u.approval_ref,
             k.id as kyc_id, k.pan_last4, k.aadhaar_last4, k.review_status::text, k.admin_notes,
             k.reviewed_at, k.reviewed_by, k.address_json, k.document_refs_json
      FROM users u
      LEFT JOIN kyc_profiles k ON k.user_id = u.id
      LEFT JOIN risk_profiles r ON r.user_id = u.id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    const row = userResult.rows[0];
    const user = {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email || 'Client',
      email: row.email || '',
      phone: row.phone || '',
      role: row.role || 'client',
      status: row.status || 'approved',
      approvalRef: row.approval_ref || '',
      riskProfileStatus: row.risk_profile_status || 'approved',
      kycStatus: row.kyc_status || 'approved',
      createdAt: row.created_at || '',
      approvedAt: row.approved_at || '',
      updatedAt: row.updated_at || '',
      rejectedAt: row.rejected_at || '',
      suspendedAt: row.suspended_at || '',
      closedAt: row.closed_at || '',
    };

    const kycProfile = row.kyc_id ? {
      id: row.kyc_id,
      userId: row.id,
      panLast4: row.pan_last4 || '',
      aadhaarLast4: row.aadhaar_last4 || '',
      reviewStatus: row.review_status || 'not_started',
      adminNotes: row.admin_notes || '',
      reviewedAt: row.reviewed_at || '',
      reviewedBy: row.reviewed_by || '',
      address: row.address_json || {},
      documentRefs: row.document_refs_json || [],
    } : null;

    const [plansRes, paymentsRes, mandatesRes, txRes] = await Promise.all([
      query(config, `SELECT * FROM investment_plans WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
      query(config, `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
      query(config, `SELECT * FROM mandates WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
      query(config, `SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
    ]);

    const investmentPlans = plansRes.rows.map(toCamelCase);
    const payments = paymentsRes.rows.map(toCamelCase);
    const mandates = mandatesRes.rows.map(toCamelCase);
    const transactions = txRes.rows.map(toCamelCase);

    const paymentIds = new Set(payments.map((p) => p.id));
    const mandateIds = new Set(mandates.map((m) => m.id));
    const planIds = new Set(investmentPlans.map((p) => p.id));
    const txIds = new Set(transactions.map((t) => t.id));
    const kycProfileId = kycProfile?.id || null;

    const allEntityIds = [
      userId,
      ...Array.from(paymentIds),
      ...Array.from(mandateIds),
      ...Array.from(planIds),
      ...Array.from(txIds),
      ...(kycProfileId ? [kycProfileId] : []),
    ];

    const auditResult = await query(config, `
      SELECT * FROM admin_audit_logs
      WHERE entity_id = ANY($1::uuid[])
      ORDER BY created_at DESC
      LIMIT 20
    `, [allEntityIds]);

    const auditLogs = auditResult.rows
      .filter((log) => {
        if (log.entity_type === 'users' && log.entity_id === userId) return true;
        if (log.entity_type === 'payment') return paymentIds.has(log.entity_id);
        if (log.entity_type === 'mandate') return mandateIds.has(log.entity_id);
        if (log.entity_type === 'investment_plan') return planIds.has(log.entity_id);
        if (log.entity_type === 'transaction') return txIds.has(log.entity_id);
        if (log.entity_type === 'kyc_profile') return log.entity_id === kycProfileId;
        return false;
      })
      .map(toCamelCase);

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

  const store = await readJsonStore(config);
  const rawUser = store.users.find((u) => u.id === userId);
  if (!rawUser) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  // Normalize user shape to match what the frontend expects
  const user = {
    id: rawUser.id,
    firstName: rawUser.firstName || '',
    lastName: rawUser.lastName || '',
    name: [rawUser.firstName, rawUser.lastName].filter(Boolean).join(' ') || rawUser.email || 'Client',
    email: rawUser.email || '',
    phone: rawUser.phone || '',
    role: rawUser.role || 'client',
    status: rawUser.status || 'approved',
    approvalRef: rawUser.approvalRef || rawUser.approval_ref || '',
    riskProfileStatus: rawUser.riskProfileStatus || 'approved',
    kycStatus: rawUser.kycStatus || 'approved',
    createdAt: rawUser.createdAt || '',
    approvedAt: rawUser.approvedAt || '',
    updatedAt: rawUser.updatedAt || '',
    rejectedAt: rawUser.rejectedAt || '',
    suspendedAt: rawUser.suspendedAt || '',
    closedAt: rawUser.closedAt || '',
  };

  const kycProfile = store.kycProfiles.find((p) => p.userId === userId) || null;

  const filterByUser = (item) => item.userId === userId;

  const investmentPlans = (store.investmentPlans || []).filter(filterByUser);
  const payments = (store.payments || []).filter(filterByUser);
  const mandates = (store.mandates || []).filter(filterByUser);
  const redemptionRequests = (store.redemptionRequests || []).filter(filterByUser);
  const sipControlRequests = (store.sipControlRequests || []).filter(filterByUser);
  const supportTickets = (store.supportTickets || []).filter(filterByUser);
  const notifications = recentItems((store.notifications || []).filter(filterByUser), 20);

  const userPaymentIds = new Set(payments.map((p) => p.id));
  const userMandateIds = new Set(mandates.map((m) => m.id));
  const userPlanIds = new Set(investmentPlans.map((p) => p.id));
  const userSipIds = new Set(sipControlRequests.map((r) => r.id));
  const userRedemptionIds = new Set(redemptionRequests.map((r) => r.id));
  const userTxIds = new Set((store.transactions || []).filter(filterByUser).map((t) => t.id));
  const userReceiptIds = new Set((store.receipts || []).filter(filterByUser).map((r) => r.id));

  const auditLogs = recentItems(
    (store.adminAuditLogs || []).filter((log) => {
      if (log.entityType === 'users' && log.entityId === userId) return true;
      switch (log.entityType) {
        case 'payment': return userPaymentIds.has(log.entityId);
        case 'mandate': return userMandateIds.has(log.entityId);
        case 'investment_plan': return userPlanIds.has(log.entityId);
        case 'transaction': return userTxIds.has(log.entityId);
        case 'sip_control_request': return userSipIds.has(log.entityId);
        case 'redemption_request': return userRedemptionIds.has(log.entityId);
        case 'redemption': return userRedemptionIds.has(log.entityId);
        case 'receipt': return userReceiptIds.has(log.entityId);
        case 'kyc_profile': return log.entityId === (kycProfile?.id);
        case 'support_ticket': return supportTickets.some((t) => t.id === log.entityId);
        default: return false;
      }
    }),
    20,
  );

  const portfolio = store[`portfolio_${userId}`] || null;

  return {
    user,
    kycProfile,
    blockingReasons: computeBlockingReasons(user, kycProfile),
    investmentPlans,
    payments,
    mandates,
    redemptionRequests,
    sipControlRequests,
    supportTickets,
    notifications,
    auditLogs,
    portfolio,
  };
}

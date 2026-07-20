import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { HttpError } from '#http/errors.js';
import { query } from '#db/client.js';

function computeBlockingReasons(user: any, kycProfile: any) {
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

function toCamelCase(obj: Record<string, any> | null | undefined) {
  if (!obj || typeof obj !== 'object') return obj;
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

export async function getUserDetail(config: AppConfig, actor: Actor, userId: string) {
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

  const paymentIds = new Set(payments.map((p) => p?.id));
  const mandateIds = new Set(mandates.map((m) => m?.id));
  const planIds = new Set(investmentPlans.map((p) => p?.id));
  const txIds = new Set(transactions.map((t) => t?.id));
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

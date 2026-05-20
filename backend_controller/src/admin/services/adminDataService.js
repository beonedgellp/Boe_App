import { randomUUID } from 'node:crypto';
import { emptyCollection } from '../../shared/services/placeholderService.js';
import { getPublishedAppConfig } from '../../shared/services/appConfigService.js';
import { HttpError } from '../../http/errors.js';
import { query, transaction } from '../../db/client.js';
import { jsonStoreEnabled, readJsonStore, updateJsonStore } from '../../db/jsonStore.js';
import { notifyUserApproved, notifyUserRejected } from './notificationComposerService.js';

const PENDING_APPROVAL_STATUSES = new Set(['draft', 'pending_review', 'kyc_pending']);

function displayName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Client';
}

function userPayload(user) {
  return {
    id: user.id,
    name: displayName(user),
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || 'client',
    status: user.status || 'approved',
    approvalRef: user.approvalRef || user.approval_ref || '',
    riskProfileStatus: user.riskProfileStatus || 'approved',
    kycStatus: user.kycStatus || 'approved',
    createdAt: user.createdAt || '',
    approvedAt: user.approvedAt || '',
  };
}

function collection(items, source = 'json') {
  return {
    items,
    count: items.length,
    source,
  };
}

function emptyForActiveStore(config) {
  return emptyCollection({ source: `${config.dataStore}_pending` });
}

function computeAutopaySuccess(mandates) {
  if (!Array.isArray(mandates) || mandates.length === 0) return 'N/A';
  const successStatuses = new Set(['active', 'success', 'confirmed']);
  const successCount = mandates.filter((m) => successStatuses.has(m.status)).length;
  return `${Math.round((successCount / mandates.length) * 100)}%`;
}

function rowUserPayload(row) {
  return userPayload({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    riskProfileStatus: row.risk_profile_status,
    kycStatus: row.kyc_status,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
  });
}

async function postgresUsers(config, whereSql = '', params = []) {
  const result = await query(config, `
    SELECT id, first_name, last_name, email, phone, role::text, status::text,
           risk_profile_status::text, kyc_status::text, created_at, approved_at
    FROM users
    ${whereSql}
    ORDER BY created_at DESC
  `, params);
  return result.rows.map(rowUserPayload);
}

function pendingApproval(user) {
  return (user.role || 'client') === 'client' && PENDING_APPROVAL_STATUSES.has(user.status);
}

async function jsonCollection(config, key) {
  if (!jsonStoreEnabled(config)) return emptyForActiveStore(config);
  const store = await readJsonStore(config);
  return collection(Array.isArray(store[key]) ? store[key] : []);
}

function todayCount(items, dateKey) {
  const today = new Date().toISOString().slice(0, 10);
  return items.filter((item) => String(item[dateKey] || item.createdAt || '').startsWith(today)).length;
}

export async function adminOverview(config) {
  if (!jsonStoreEnabled(config)) {
    const result = await query(config, `
      SELECT role::text, status::text, kyc_status::text
      FROM users
    `);
    const users = result.rows.map((row) => ({
      role: row.role,
      status: row.status,
      kycStatus: row.kyc_status,
    }));
    const pendingApprovals = users.filter(pendingApproval);
    const kyc = users.filter((user) => user.role === 'client' && user.kycStatus && user.kycStatus !== 'approved');
    const rejected = users.filter((user) => user.role === 'client' && user.status === 'rejected');
    const approved = users.filter((user) => user.role === 'client' && user.status === 'approved');

    return {
      source: 'postgres',
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

  const store = await readJsonStore(config);
  const users = store.users.map(userPayload);
  const payments = store.payments || [];
  const mandates = store.mandates || [];
  const sipControlRequests = store.sipControlRequests || [];
  const supportTickets = store.supportTickets || [];
  const pendingApprovals = users.filter(pendingApproval);
  const kyc = users.filter((user) => user.role === 'client' && user.kycStatus && user.kycStatus !== 'approved');
  const rejectedThisWeek = users.filter((user) => user.status === 'rejected');

  let strategies = [];
  try {
    const appConfig = await getPublishedAppConfig(config);
    strategies = appConfig.config?.mobile?.products || [];
  } catch {
    strategies = [];
  }

  return {
    source: 'json',
    counts: {
      approvals: pendingApprovals.length,
      kyc: kyc.length,
      requests: sipControlRequests.length,
      users: users.length,
      products: strategies.length,
      payments: payments.length,
      mandates: mandates.length,
      support: supportTickets.length,
      audit: store.adminAuditLogs.length,
    },
    stats: {
      pendingApprovals: pendingApprovals.length,
      approvedThisWeek: users.filter((user) => user.status === 'approved').length,
      rejectedThisWeek: rejectedThisWeek.length,
      avgReviewTime: '0h',
      paymentsProcessedToday: todayCount(payments, 'time'),
      pendingPayments: payments.filter((item) => item.status === 'pending').length,
      failedPayments: payments.filter((item) => item.status === 'failed').length,
      reconciledPayments: payments.filter((item) => item.status === 'reconciled').length,
      activeMandates: mandates.filter((item) => item.status === 'active').length,
      pendingMandates: mandates.filter((item) => item.status === 'pending_user_auth').length,
      pausedMandates: mandates.filter((item) => item.status === 'paused').length,
      autopaySuccess: computeAutopaySuccess(mandates),
    },
  };
}

export async function adminUsers(config, { status = 'approved', q, page = 1, limit = 25 } = {}) {
  let users;
  if (!jsonStoreEnabled(config)) {
    let whereSql = "WHERE role = 'client'";
    const params = [];
    if (status) {
      params.push(status);
      whereSql += ` AND status = $${params.length}::user_status`;
    }
    if (q) {
      params.push(`%${q}%`);
      whereSql += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }
    users = await postgresUsers(config, whereSql, params);
  } else {
    const store = await readJsonStore(config);
    users = store.users.map(userPayload).filter((user) => (user.role || 'client') === 'client');
    if (status) {
      users = users.filter((user) => user.status === status);
    }
    if (q) {
      const lowerQ = q.toLowerCase();
      users = users.filter((user) =>
        user.name.toLowerCase().includes(lowerQ) ||
        user.email.toLowerCase().includes(lowerQ) ||
        user.phone.includes(lowerQ)
      );
    }
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
    source: jsonStoreEnabled(config) ? 'json' : 'postgres',
  };
}

export async function adminTransactions(config, { fundId, status, type, userId, q, page = 1, limit = 25 } = {}) {
  let transactions = [];

  if (!jsonStoreEnabled(config)) {
    let whereSql = 'WHERE 1=1';
    const params = [];
    if (fundId) {
      params.push(fundId);
      whereSql += ` AND product_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      whereSql += ` AND status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      whereSql += ` AND type = $${params.length}`;
    }
    if (userId) {
      params.push(userId);
      whereSql += ` AND user_id = $${params.length}`;
    }

    const result = await query(config, `
      SELECT t.id, t.user_id, t.product_id, t.investment_plan_id, t.type::text,
             t.amount, t.date, t.nav, t.units, t.status::text, t.idempotency_key,
             t.requested_at, t.payment_confirmed_at, t.allotted_at, t.cancelled_at,
             t.created_at, t.updated_at,
             u.first_name, u.last_name, u.email,
             f.name as fund_name
      FROM transactions t
      JOIN users u ON u.id = t.user_id
      LEFT JOIN funds f ON f.id = t.product_id
      ${whereSql}
      ORDER BY t.created_at DESC
    `, params);

    transactions = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      productId: row.product_id,
      investmentPlanId: row.investment_plan_id,
      type: row.type,
      amount: row.amount,
      date: row.date,
      nav: row.nav,
      units: row.units,
      status: row.status,
      idempotencyKey: row.idempotency_key,
      requestedAt: row.requested_at,
      paymentConfirmedAt: row.payment_confirmed_at,
      allottedAt: row.allotted_at,
      cancelledAt: row.cancelled_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userName: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email || row.user_id,
      userEmail: row.email || '',
      fundName: row.fund_name || row.product_id || '—',
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
  } else {
    const store = await readJsonStore(config);
    const users = store.users || [];
    const funds = store.funds || [];

    transactions = (store.transactions || []).map((tx) => {
      const user = users.find((u) => u.id === tx.userId);
      const fund = funds.find((f) => f.id === tx.productId);
      return {
        ...tx,
        userName: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || tx.userId : tx.userId,
        userEmail: user?.email || '',
        fundName: fund?.name || tx.productId || '—',
      };
    });

    if (fundId) {
      transactions = transactions.filter((tx) => tx.productId === fundId);
    }
    if (status) {
      transactions = transactions.filter((tx) => tx.status === status);
    }
    if (type) {
      transactions = transactions.filter((tx) => tx.type === type);
    }
    if (userId) {
      transactions = transactions.filter((tx) => tx.userId === userId);
    }
    if (q) {
      const lowerQ = q.toLowerCase();
      transactions = transactions.filter((tx) =>
        tx.userName.toLowerCase().includes(lowerQ) ||
        tx.userEmail.toLowerCase().includes(lowerQ) ||
        tx.fundName.toLowerCase().includes(lowerQ) ||
        tx.id.toLowerCase().includes(lowerQ)
      );
    }

    transactions.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
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
    source: jsonStoreEnabled(config) ? 'json' : 'postgres',
  };
}

export async function adminApprovals(config, status = 'pending') {
  const pendingStatuses = ['draft', 'pending_review', 'kyc_pending'];
  let users;

  if (!jsonStoreEnabled(config)) {
    let whereSql = "WHERE role = 'client'";
    const params = [];

    if (status === 'pending') {
      whereSql += ` AND status IN ('draft', 'pending_review', 'kyc_pending')`;
    } else if (status === 'rejected') {
      whereSql += ` AND status = 'rejected'`;
    } else if (status === 'approved') {
      whereSql += ` AND status = 'approved'`;
    }
    // status === 'all' adds no filter

    users = await postgresUsers(config, whereSql, params);
  } else {
    const store = await readJsonStore(config);
    users = store.users
      .map(userPayload)
      .filter((user) => (user.role || 'client') === 'client');

    if (status === 'pending') {
      users = users.filter((user) => pendingStatuses.includes(user.status));
    } else if (status === 'rejected') {
      users = users.filter((user) => user.status === 'rejected');
    } else if (status === 'approved') {
      users = users.filter((user) => user.status === 'approved');
    }
    // status === 'all' keeps all
  }

  return collection(users);
}

function kycReviewPayload(user, kycProfile) {
  return {
    ...userPayload(user),
    panLast4: kycProfile?.pan_last4 || kycProfile?.panLast4 || '',
    aadhaarLast4: kycProfile?.aadhaar_last4 || kycProfile?.aadhaarLast4 || '',
    kycReviewStatus: kycProfile?.review_status || kycProfile?.reviewStatus || 'not_started',
    kycAdminNotes: kycProfile?.admin_notes || kycProfile?.adminNotes || '',
    kycReviewedAt: kycProfile?.reviewed_at || kycProfile?.reviewedAt || '',
    kycReviewedBy: kycProfile?.reviewed_by || kycProfile?.reviewedBy || '',
    kycAddress: kycProfile?.address_json || kycProfile?.address || {},
    kycDocuments: kycProfile?.document_refs_json || kycProfile?.documentRefs || [],
  };
}

async function postgresKycReview(config) {
  const result = await query(config, `
    SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role::text, u.status::text,
           u.risk_profile_status::text, u.kyc_status::text, u.created_at, u.approved_at,
           k.pan_last4, k.aadhaar_last4, k.review_status::text, k.admin_notes, k.reviewed_at, k.reviewed_by,
           k.address_json, k.document_refs_json
    FROM users u
    LEFT JOIN kyc_profiles k ON k.user_id = u.id
    WHERE u.role = 'client' AND u.kyc_status <> 'approved'
    ORDER BY u.created_at DESC
  `);
  return result.rows.map((row) => {
    const user = rowUserPayload(row);
    const kycProfile = {
      pan_last4: row.pan_last4,
      aadhaar_last4: row.aadhaar_last4,
      review_status: row.review_status,
      admin_notes: row.admin_notes,
      reviewed_at: row.reviewed_at,
      reviewed_by: row.reviewed_by,
      address_json: row.address_json,
      document_refs_json: row.document_refs_json,
    };
    return kycReviewPayload(user, kycProfile);
  });
}

export async function adminKycReview(config) {
  if (!jsonStoreEnabled(config)) {
    return collection(await postgresKycReview(config), 'postgres');
  }
  const store = await readJsonStore(config);
  const kycProfiles = store.kycProfiles || [];
  return collection(
    store.users
      .map(userPayload)
      .filter((user) => user.kycStatus && user.kycStatus !== 'approved')
      .map((user) => {
        const kycProfile = kycProfiles.find((p) => p.userId === user.id);
        return kycReviewPayload(user, kycProfile);
      }),
  );
}

function riskProfilePayload(user, riskProfile) {
  return {
    ...userPayload(user),
    ageBand: riskProfile?.age_band || riskProfile?.ageBand || '',
    investmentHorizon: riskProfile?.investment_horizon || riskProfile?.investmentHorizon || '',
    incomeBand: riskProfile?.income_band || riskProfile?.incomeBand || '',
    lossTolerance: riskProfile?.loss_tolerance || riskProfile?.lossTolerance || '',
    investmentExperience: riskProfile?.investment_experience || riskProfile?.investmentExperience || '',
    riskCompletedAt: riskProfile?.completed_at || riskProfile?.completedAt || '',
    riskAnswers: riskProfile?.answers_json || riskProfile?.answers || {},
  };
}

async function postgresRiskProfiles(config) {
  const result = await query(config, `
    SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role::text, u.status::text,
           u.risk_profile_status::text, u.kyc_status::text, u.created_at, u.approved_at,
           r.age_band, r.investment_horizon, r.income_band, r.loss_tolerance, r.investment_experience,
           r.completed_at, r.answers_json
    FROM users u
    LEFT JOIN risk_profiles r ON r.user_id = u.id
    WHERE u.role = 'client'
    ORDER BY u.created_at DESC
  `);
  return result.rows.map((row) => {
    const user = rowUserPayload(row);
    const riskProfile = {
      age_band: row.age_band,
      investment_horizon: row.investment_horizon,
      income_band: row.income_band,
      loss_tolerance: row.loss_tolerance,
      investment_experience: row.investment_experience,
      completed_at: row.completed_at,
      answers_json: row.answers_json,
    };
    return riskProfilePayload(user, riskProfile);
  });
}

export async function adminRiskProfiles(config) {
  if (!jsonStoreEnabled(config)) {
    return collection(await postgresRiskProfiles(config), 'postgres');
  }
  const store = await readJsonStore(config);
  const riskProfiles = store.riskProfiles || [];
  return collection(
    store.users
      .map(userPayload)
      .filter((user) => (user.role || 'client') === 'client')
      .map((user) => {
        const riskProfile = riskProfiles.find((p) => p.userId === user.id);
        return riskProfilePayload(user, riskProfile);
      }),
  );
}

export async function adminStrategies(config) {
  try {
    const appConfig = await getPublishedAppConfig(config);
    return collection(appConfig.config?.mobile?.products || [], appConfig.source || config.dataStore);
  } catch {
    return emptyForActiveStore(config);
  }
}

function paymentTimestamp(payment) {
  return payment.time || payment.createdAt || payment.confirmedAt || payment.reconciledAt || payment.updatedAt || '';
}

function findPaymentPlan(store, payment, transaction) {
  const plans = store.investmentPlans || store.orders || [];
  if (transaction?.investmentPlanId) {
    const byTransaction = plans.find((plan) => plan.id === transaction.investmentPlanId);
    if (byTransaction) return byTransaction;
  }
  if (payment.investmentPlanId) {
    const byPaymentPlanId = plans.find((plan) => plan.id === payment.investmentPlanId);
    if (byPaymentPlanId) return byPaymentPlanId;
  }
  if (payment.id) {
    const byPaymentId = plans.find((plan) => plan.paymentId === payment.id);
    if (byPaymentId) return byPaymentId;
  }
  return null;
}

function resolvePaymentFund(store, payment, transaction, plan) {
  const fundId = payment.fundId || payment.productId || transaction?.productId || plan?.productId || plan?.fundId || null;
  const fund = fundId ? (store.funds || []).find((item) => item.id === fundId) : null;
  return { fundId, fund };
}

function userName(user, fallback = '') {
  if (!user) return fallback;
  return displayName(user);
}

function enrichPaymentRow(store, payment) {
  const transaction = (store.transactions || []).find((item) => item.id === payment.transactionId) || null;
  const plan = findPaymentPlan(store, payment, transaction);
  const { fundId, fund } = resolvePaymentFund(store, payment, transaction, plan);
  const user = (store.users || []).find((item) => item.id === payment.userId) || null;
  const name = userName(user, payment.user || payment.userId || 'Client');
  const time = paymentTimestamp(payment);
  const amount = Number(payment.amount || transaction?.amount || plan?.amount || 0);

  return {
    ...payment,
    id: payment.id,
    paymentId: payment.id,
    userId: payment.userId || user?.id || '',
    user: name,
    userName: name,
    userEmail: user?.email || payment.userEmail || '',
    amount,
    resolvedAmount: amount,
    mode: payment.mode || transaction?.type || plan?.type || '',
    provider: payment.provider || '',
    status: payment.status || 'unknown',
    time,
    createdAt: payment.createdAt || time,
    transactionId: payment.transactionId || transaction?.id || null,
    transactionStatus: transaction?.status || null,
    transactionType: transaction?.type || null,
    planId: plan?.id || payment.investmentPlanId || transaction?.investmentPlanId || null,
    planType: plan?.type || null,
    fundId,
    fundName: fund?.name || fund?.title || fundId || 'Unmapped fund',
    fundPoolSize: Number(fund?.totalPoolSize || 0),
    poolPostedAt: payment.poolPostedAt || null,
    poolPostedAmount: Number(payment.poolPostedAmount || 0),
    approvedAt: payment.approvedAt || null,
    approvedBy: payment.approvedBy || null,
    rejectedAt: payment.rejectedAt || null,
    rejectionReason: payment.rejectionReason || null,
    settlementReference: payment.settlementReference || null,
    providerPaymentId: payment.providerPaymentId || null,
    providerOrderId: payment.providerOrderId || null,
  };
}

function matchesDateRange(row, from, to) {
  const value = row.time || row.createdAt || '';
  if (!value) return !(from || to);
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return true;
  if (from) {
    const start = new Date(from).getTime();
    if (!Number.isNaN(start) && ts < start) return false;
  }
  if (to) {
    const end = new Date(`${to}T23:59:59.999Z`).getTime();
    if (!Number.isNaN(end) && ts > end) return false;
  }
  return true;
}

export async function adminPayments(config, filters = {}) {
  if (!jsonStoreEnabled(config)) return emptyForActiveStore(config);
  const store = await readJsonStore(config);
  const queryText = String(filters.q || '').trim().toLowerCase();
  const status = String(filters.status || '').trim();
  const fundId = String(filters.fundId || '').trim();
  const userId = String(filters.userId || '').trim();
  const provider = String(filters.provider || '').trim();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize || filters.limit) || 100));

  let items = (store.payments || []).map((payment) => enrichPaymentRow(store, payment));

  if (fundId) items = items.filter((row) => row.fundId === fundId);
  if (status) items = items.filter((row) => row.status === status);
  if (userId) items = items.filter((row) => row.userId === userId);
  if (provider) items = items.filter((row) => row.provider === provider);
  if (filters.from || filters.to) {
    items = items.filter((row) => matchesDateRange(row, filters.from, filters.to));
  }
  if (queryText) {
    items = items.filter((row) => [
      row.id,
      row.userName,
      row.userEmail,
      row.fundName,
      row.providerPaymentId,
      row.providerOrderId,
      row.settlementReference,
      row.transactionId,
    ].some((value) => String(value || '').toLowerCase().includes(queryText)));
  }

  items = items.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
  const total = items.length;
  const start = (page - 1) * pageSize;
  const pagedItems = items.slice(start, start + pageSize);

  return {
    items: pagedItems,
    count: pagedItems.length,
    total,
    page,
    pageSize,
    source: 'json',
  };
}

export async function adminMandates(config) {
  return jsonCollection(config, 'mandates');
}

export async function adminSipControlRequests(config) {
  if (!jsonStoreEnabled(config)) return emptyForActiveStore(config);
  const store = await readJsonStore(config);
  const users = store.users || [];
  const plans = store.investmentPlans || store.orders || [];
  const funds = store.funds || [];

  const items = (store.sipControlRequests || []).map((req) => {
    const user = users.find((u) => u.id === req.userId);
    const plan = plans.find((p) => p.id === req.planId);
    const fund = plan ? funds.find((f) => f.id === plan.productId) : null;
    return {
      ...req,
      userName: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || req.userId : req.userId,
      userEmail: user?.email || '',
      fundName: fund?.name || plan?.productId || '—',
      amount: plan?.amount ?? null,
    };
  });

  return collection(items);
}

export async function adminSupportTickets(config) {
  return jsonCollection(config, 'supportTickets');
}

export async function adminFunds(config) {
  return jsonCollection(config, 'funds');
}

export async function adminAuditLogs(config) {
  if (!jsonStoreEnabled(config)) return emptyForActiveStore(config);
  const store = await readJsonStore(config);
  return collection(store.adminAuditLogs);
}

export async function adminPendingStats(config) {
  if (!jsonStoreEnabled(config)) {
    const result = await query(config, `
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'client' AND status IN ('draft', 'pending_review', 'kyc_pending')
    `);
    return { pendingCount: Number(result.rows[0]?.count || 0), source: 'postgres' };
  }
  const store = await readJsonStore(config);
  const users = store.users || [];
  const pendingCount = users.filter((u) => (u.role || 'client') === 'client' && PENDING_APPROVAL_STATUSES.has(u.status)).length;
  return { pendingCount, source: 'json' };
}

export async function updateUserStatus(config, actor, userId, body = {}, metadata = {}) {
  const nextStatus = String(body.status || '').trim();
  if (!['pending_review', 'approved', 'rejected', 'suspended', 'closed'].includes(nextStatus)) {
    throw new HttpError(400, 'INVALID_USER_STATUS', 'Unsupported user status.');
  }

  const reason = String(body.reason || '').trim() || null;

  if (nextStatus === 'rejected' && !reason) {
    throw new HttpError(400, 'REASON_REQUIRED', 'A rejection reason is required.');
  }

  if (jsonStoreEnabled(config)) {
    const updated = await updateJsonStore(config, (store) => {
      const user = store.users.find((item) => item.id === userId);
      if (!user) return null;
      if ((user.role || 'client') !== 'client') {
        throw new HttpError(400, 'ADMIN_USER_STATUS_FORBIDDEN', 'Only client users can be updated from this queue.');
      }

      const before = userPayload(user);
      const now = new Date().toISOString();
      user.status = nextStatus;
      user.updatedAt = now;
      if (!user.approvalRef) user.approvalRef = randomUUID();
      if (nextStatus === 'approved') {
        user.approvedAt = now;
        user.riskProfileStatus = user.riskProfileStatus === 'pending' ? 'approved' : user.riskProfileStatus;
        user.kycStatus = user.kycStatus === 'pending' ? 'approved' : user.kycStatus;
      } else {
        user.approvedAt = null;
      }
      if (nextStatus === 'rejected') user.rejectedAt = now;
      if (nextStatus === 'suspended') user.suspendedAt = now;
      if (nextStatus === 'closed') user.closedAt = now;

      const after = userPayload(user);
      store.adminAuditLogs.push({
        id: randomUUID(),
        adminId: actor?.userId || null,
        action: 'user.status.update',
        entityType: 'users',
        entityId: user.id,
        beforeJson: before,
        afterJson: after,
        reason,
        ipAddress: metadata.ipAddress || null,
        userAgent: metadata.userAgent || null,
        createdAt: now,
      });
      return after;
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

  const updated = await transaction(config, async (client) => {
    const found = await client.query(`
      SELECT id, first_name, last_name, email, phone, role::text, status::text,
             risk_profile_status::text, kyc_status::text, created_at, approved_at
      FROM users
      WHERE id = $1
      FOR UPDATE
    `, [userId]);
    const beforeRow = found.rows[0];
    if (!beforeRow) return null;
    if (beforeRow.role !== 'client') {
      throw new HttpError(400, 'ADMIN_USER_STATUS_FORBIDDEN', 'Only client users can be updated from this queue.');
    }

    const result = await client.query(`
      UPDATE users
      SET status = $2::user_status,
          risk_profile_status = CASE
            WHEN $2::user_status = 'approved' AND risk_profile_status = 'pending' THEN 'approved'::review_status
            ELSE risk_profile_status
          END,
          kyc_status = CASE
            WHEN $2::user_status = 'approved' AND kyc_status = 'pending' THEN 'approved'::review_status
            ELSE kyc_status
          END,
          approved_at = CASE WHEN $2::user_status = 'approved' THEN now() ELSE NULL END,
          rejected_at = CASE WHEN $2::user_status = 'rejected' THEN now() ELSE rejected_at END,
          suspended_at = CASE WHEN $2::user_status = 'suspended' THEN now() ELSE suspended_at END,
          closed_at = CASE WHEN $2::user_status = 'closed' THEN now() ELSE closed_at END,
          updated_at = now()
      WHERE id = $1
      RETURNING id, first_name, last_name, email, phone, role::text, status::text,
                risk_profile_status::text, kyc_status::text, created_at, approved_at
    `, [userId, nextStatus]);
    const afterRow = result.rows[0];

    await client.query(`
      INSERT INTO admin_audit_logs (
        admin_id, action, entity_type, entity_id, before_json, after_json, reason, ip_address, user_agent
      )
      VALUES ($1, 'user.status.update', 'users', $2, $3::jsonb, $4::jsonb, $5, $6::inet, $7)
    `, [
      actor?.userId || null,
      userId,
      JSON.stringify(rowUserPayload(beforeRow)),
      JSON.stringify(rowUserPayload(afterRow)),
      reason,
      metadata.ipAddress,
      metadata.userAgent,
    ]);

    return rowUserPayload(afterRow);
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

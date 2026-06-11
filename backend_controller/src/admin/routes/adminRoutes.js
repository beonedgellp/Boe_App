import { Routes } from '#shared/routes/constants.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { registerInternalRoutes } from '#shared/routes/internalRoutes.js';
import { registerAdminReceiptRoutes } from '#shared/routes/receiptRoutes.js';
import { registerAdminTimelineRoutes } from '#shared/routes/timelineRoutes.js';
import { readJsonStore, updateJsonStore } from '#db/pgAdapter.js';
import { reviewKyc } from '../services/kycReviewService.js';
import { getUserDetail } from '../services/userDetailService.js';
import { replyToTicket } from '../services/supportTicketAdminService.js';
import { reviewSipControlRequest } from '../services/sipControlAdminService.js';
import { sendNotification, listAdminNotifications } from '../services/notificationComposerService.js';
import { listAdminFaqs, createFaq, updateFaq, deleteFaq } from '../services/faqAdminService.js';
import { getPublishedAppConfig, publishAppConfig } from '#shared/services/appConfigService.js';
import { getPublishedLandingConfig, publishLandingConfig } from '#shared/services/landingConfigService.js';
import {
  adminApprovals,
  adminAuditLogs,
  adminFunds,
  adminKycReview,
  adminMandates,
  adminOverview,
  adminPayments,
  adminPendingStats,
  adminRiskProfiles,
  adminStrategies,
  adminSipControlRequests,
  adminSupportTickets,
  adminTransactions,
  adminUsers,
  updateUserStatus,
} from '../services/adminDataService.js';
import {
  listFunds, createFund, getFund, updateFund, deleteFund,
  allocateFunds, unallocateFunds, adminOutflow, adminInflow,
  listCapitalTransactions,
  listRedemptionRequests, processRedemptionRequest,
} from '../services/fundsService.js';
import {
  listAdminCourses, createCourse, updateCourse, deleteCourse,
} from '#shared/services/courseService.js';
import {
  listAdminPlans, createPlan, updatePlan, deletePlan,
} from '#shared/services/planService.js';
import { updateMandateStatus } from '../services/mandateAdminService.js';
import {
  approvePayment,
  rejectPayment,
  reconcilePayment,
  paymentReconcileRequestContext,
  listReconciliationLedger,
} from '../services/paymentReconcileService.js';

const ADMIN_ROLES = ['admin'];

export function registerAdminRoutes(router) {
  // Admin-only receipts/timeline + internal route metadata belong to the admin surface
  // so a client-only server doesn't expose them.
  registerAdminReceiptRoutes(router);
  registerAdminTimelineRoutes(router);
  registerInternalRoutes(router);

  router.get(Routes.GET_V1_ADMIN_OVERVIEW, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Admin dashboard counts and summary stats.',
  }, ({ config }) => adminOverview(config));

  router.get(Routes.GET_V1_ADMIN_STATS_PENDING, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Pending approval count for sidebar badge.',
  }, ({ config }) => adminPendingStats(config));

  router.get(Routes.GET_V1_ADMIN_USERS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Admin user list with search, filter and pagination.',
  }, ({ config, query }) => adminUsers(config, {
    status: query?.status,
    q: query?.q,
    page: Number(query?.page) || 1,
    limit: Math.min(100, Math.max(1, Number(query?.limit) || 25)),
  }));

  router.get(Routes.GET_V1_ADMIN_APPROVALS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Admin user approval queue with status filter.',
  }, ({ config, query }) => adminApprovals(config, query?.status || 'pending'));

  router.get(Routes.GET_V1_ADMIN_KYC_REVIEW, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'KYC review queue.',
  }, ({ config }) => adminKycReview(config));

  router.get(Routes.GET_V1_ADMIN_RISK_PROFILES, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Risk profiles list.',
  }, ({ config }) => adminRiskProfiles(config));

  router.get(Routes.GET_V1_ADMIN_PRODUCTS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Admin strategy catalogue.',
  }, ({ config }) => adminStrategies(config));

  router.get(Routes.GET_V1_ADMIN_PAYMENTS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Payment reconciliation queue.',
  }, ({ config, query }) => adminPayments(config, {
    fundId: query?.fundId || '',
    status: query?.status || '',
    userId: query?.userId || '',
    provider: query?.provider || '',
    from: query?.from || '',
    to: query?.to || '',
    q: query?.q || '',
    page: Number(query?.page) || 1,
    pageSize: Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 100)),
  }));

  router.get(Routes.GET_V1_ADMIN_MANDATES, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Mandate operations list.',
  }, ({ config }) => adminMandates(config));

  router.get(Routes.GET_V1_ADMIN_SIP_CONTROL_REQUESTS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'SIP control request queue.',
  }, ({ config }) => adminSipControlRequests(config));

  router.get(Routes.GET_V1_ADMIN_AUDIT_LOGS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Admin audit log search.',
  }, ({ config }) => adminAuditLogs(config));

  router.get(Routes.GET_V1_ADMIN_SUPPORT_TICKETS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Support ticket queue.',
  }, ({ config }) => adminSupportTickets(config));

  router.post(Routes.POST_V1_ADMIN_SUPPORT_TICKETS_TICKET_ID_REPLY, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Reply to a support ticket.',
  }, ({ config, actor, params, body }) => replyToTicket(config, actor, params.ticket_id, body));

  router.get(Routes.GET_V1_ADMIN_APP_CONFIG, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Published mobile app component and content configuration.',
  }, ({ config }) => getPublishedAppConfig(config));

  router.patch(Routes.PATCH_V1_ADMIN_APP_CONFIG, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Publish mobile app component and content configuration.',
  }, ({ actor, body, config, headers }) => publishAppConfig(config, actor, body, {
    ipAddress: String(headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
    userAgent: headers['user-agent'] || null,
  }));

  router.get(Routes.GET_V1_ADMIN_LANDING_CONFIG, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Published landing page content configuration.',
  }, ({ config }) => getPublishedLandingConfig(config));

  router.patch(Routes.PATCH_V1_ADMIN_LANDING_CONFIG, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Publish landing page content configuration.',
  }, ({ actor, body, config, headers }) => publishLandingConfig(config, actor, body, {
    ipAddress: String(headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
    userAgent: headers['user-agent'] || null,
  }));

  router.get(Routes.GET_V1_ADMIN_NOTIFICATIONS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Admin notification list.',
  }, ({ config, query }) => listAdminNotifications(config, { page: query?.page, limit: query?.limit }));

  router.post(Routes.POST_V1_ADMIN_NOTIFICATIONS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Send notification to users.',
  }, ({ config, actor, body }) => sendNotification(config, actor, body));

  router.get(Routes.GET_V1_ADMIN_FAQS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Admin FAQ list.',
  }, ({ config }) => listAdminFaqs(config));

  router.post(Routes.POST_V1_ADMIN_FAQS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Create a new FAQ.',
  }, ({ config, actor, body }) => createFaq(config, actor, body));

  router.patch(Routes.PATCH_V1_ADMIN_FAQS_FAQ_ID, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Update an FAQ.',
  }, ({ config, actor, params, body }) => updateFaq(config, actor, params.faq_id, body));

  router.delete(Routes.DELETE_V1_ADMIN_FAQS_FAQ_ID, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Delete an FAQ.',
  }, ({ config, actor, params }) => deleteFaq(config, actor, params.faq_id));

  /* ----- Courses & Plans ----- */

  router.get(Routes.GET_V1_ADMIN_COURSES, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Admin course list.',
  }, ({ config }) => listAdminCourses(config));

  router.post(Routes.POST_V1_ADMIN_COURSES, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Create a course.',
  }, ({ config, body }) => createCourse(config, body));

  router.patch(Routes.PATCH_V1_ADMIN_COURSES_COURSE_ID, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Update a course.',
  }, ({ config, params, body }) => updateCourse(config, params.course_id, body));

  router.delete(Routes.DELETE_V1_ADMIN_COURSES_COURSE_ID, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Archive a course.',
  }, ({ config, params }) => deleteCourse(config, params.course_id));

  router.get(Routes.GET_V1_ADMIN_PLANS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Admin plan list.',
  }, ({ config }) => listAdminPlans(config));

  router.post(Routes.POST_V1_ADMIN_PLANS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Create a plan.',
  }, ({ config, body }) => createPlan(config, body));

  router.patch(Routes.PATCH_V1_ADMIN_PLANS_PLAN_ID, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Update a plan.',
  }, ({ config, params, body }) => updatePlan(config, params.plan_id, body));

  router.delete(Routes.DELETE_V1_ADMIN_PLANS_PLAN_ID, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Archive a plan.',
  }, ({ config, params }) => deletePlan(config, params.plan_id));

  router.get(Routes.GET_V1_ADMIN_USERS_USER_ID_DETAIL, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Get comprehensive user detail.',
  }, ({ config, actor, params }) => getUserDetail(config, actor, params.user_id));

  router.patch(Routes.PATCH_V1_ADMIN_USERS_USER_ID_STATUS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Change user approval/status.',
  }, ({ actor, body, config, headers, params }) => updateUserStatus(config, actor, params.user_id, body, {
    ipAddress: String(headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
    userAgent: headers['user-agent'] || null,
  }));

  router.patch(Routes.PATCH_V1_ADMIN_KYC_REVIEW_USER_ID, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Review KYC profile.',
  }, ({ config, actor, params, body }) => reviewKyc(config, actor, params.user_id, body));

  router.post(Routes.POST_V1_ADMIN_PRODUCTS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Create strategy draft.',
  }, ({ actor, body, config, headers }) => createFund(config, actor, body, {
    ipAddress: String(headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
    userAgent: headers['user-agent'] || null,
  }));

  router.get(Routes.GET_V1_ADMIN_FUNDS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Admin fund catalogue with analytics.',
  }, async ({ config, query }) => {
    const { items } = await listFunds(config);
    const stage = query?.lifecycleStage;
    const filtered = stage ? items.filter(f => f.lifecycleStage === stage) : items;
    return { items: filtered, count: filtered.length };
  });

  router.get(Routes.GET_V1_ADMIN_FUNDS_FUND_ID, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Get single fund detail (admin view).',
  }, ({ config, params }) => getFund(config, params.fund_id));

  router.post(Routes.POST_V1_ADMIN_FUNDS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Create fund record.',
  }, ({ actor, body, config, headers }) => createFund(config, actor, body, {
    ipAddress: String(headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
    userAgent: headers['user-agent'] || null,
  }));

  router.patch(Routes.PATCH_V1_ADMIN_FUNDS_FUND_ID, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Update fund pool.',
  }, ({ config, actor, params, body }) => updateFund(config, actor, params.fund_id, body, {
    ipAddress: null,
    userAgent: null,
  }));

  router.delete(Routes.DELETE_V1_ADMIN_FUNDS_FUND_ID, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Delete fund pool.',
  }, ({ config, actor, params }) => deleteFund(config, actor, params.fund_id, {
    ipAddress: null,
    userAgent: null,
  }));

  /* ----- Capital Flow & Allocation APIs ----- */

  router.post(Routes.POST_V1_ADMIN_FUNDS_FUND_ID_ALLOCATE, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Allocate cash to an investment.',
  }, ({ config, actor, params, body }) => allocateFunds(config, actor, params.fund_id, body, {
    ipAddress: null,
    userAgent: null,
  }));

  router.post(Routes.POST_V1_ADMIN_FUNDS_FUND_ID_UNALLOCATE, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Unallocate funds from an investment back to cash.',
  }, ({ config, actor, params, body }) => unallocateFunds(config, actor, params.fund_id, body, {
    ipAddress: null,
    userAgent: null,
  }));

  router.post(Routes.POST_V1_ADMIN_FUNDS_FUND_ID_OUTFLOW, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Withdraw funds from the pool (external outflow).',
  }, ({ config, actor, params, body }) => adminOutflow(config, actor, params.fund_id, body, {
    ipAddress: null,
    userAgent: null,
  }));

  router.post(Routes.POST_V1_ADMIN_FUNDS_FUND_ID_INFLOW, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Add capital to the fund pool.',
  }, ({ config, actor, params, body }) => adminInflow(config, actor, params.fund_id, body, {
    ipAddress: null,
    userAgent: null,
  }));

  router.get(Routes.GET_V1_ADMIN_CAPITAL_TRANSACTIONS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'List capital transactions.',
  }, ({ config, query }) => listCapitalTransactions(config, {
    fundId: query?.fundId,
    type: query?.type,
    limit: Math.min(100, Math.max(1, Number(query?.limit) || 50)),
  }));

  /* ----- Redemption Request APIs ----- */

  router.get(Routes.GET_V1_ADMIN_REDEMPTION_REQUESTS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'List user redemption requests.',
  }, ({ config, query }) => listRedemptionRequests(config, {
    status: query?.status,
    fundId: query?.fundId,
  }));

  router.patch(Routes.PATCH_V1_ADMIN_REDEMPTION_REQUESTS_REQUEST_ID, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Approve or reject a redemption request.',
  }, ({ config, actor, params, body }) => processRedemptionRequest(config, actor, params.request_id, body, {
    ipAddress: null,
    userAgent: null,
  }));

  router.patch(Routes.PATCH_V1_ADMIN_PRODUCTS_PRODUCT_ID, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Update strategy draft or status.',
  }, ({ config, actor, params, body }) => updateFund(config, actor, params.product_id, body, {
    ipAddress: null,
    userAgent: null,
  }));

  router.post(Routes.POST_V1_ADMIN_PRODUCTS_PRODUCT_ID_DISCLOSURES, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Publish strategy disclosure.',
  }, async ({ config, actor, params, body, headers }) => {
    const fundId = params.product_id;
    const store = await readJsonStore(config);
    const fundExists = (store.funds || []).some((f) => f.id === fundId);
    if (!fundExists) throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);
    const version = String(body?.version || '1.0').trim();
    const title = String(body?.title || '').trim();
    const content = String(body?.content || '').trim();
    if (!title) throw new HttpError(400, 'TITLE_REQUIRED', 'Disclosure title is required.');
    if (!content) throw new HttpError(400, 'CONTENT_REQUIRED', 'Disclosure content is required.');
    const now = new Date().toISOString();
    const disclosure = {
      id: randomUUID(),
      fundId,
      version,
      title,
      content,
      status: 'published',
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const result = await updateJsonStore(config, (store) => {
      if (!Array.isArray(store.disclosures)) store.disclosures = [];
      store.disclosures.push(disclosure);
      if (!Array.isArray(store.adminAuditLogs)) store.adminAuditLogs = [];
      store.adminAuditLogs.push({
        id: randomUUID(),
        adminId: actor?.userId || null,
        action: 'disclosure.create',
        entityType: 'disclosure',
        entityId: disclosure.id,
        before: null,
        after: { ...disclosure },
        reason: `Disclosure created for product ${fundId}`,
        ipAddress: String(headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
        userAgent: headers['user-agent'] || null,
        createdAt: now,
      });
      return disclosure;
    });
    return result;
  });

  router.post(Routes.POST_V1_ADMIN_PRODUCTS_PRODUCT_ID_HOLDINGS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Upload strategy holdings.',
  }, async ({ config, actor, params, body, headers }) => {
    const fundId = params.product_id;
    const store = await readJsonStore(config);
    const fundExists = (store.funds || []).some((f) => f.id === fundId);
    if (!fundExists) throw new HttpError(404, 'FUND_NOT_FOUND', `Fund ${fundId} not found.`);
    const holdings = Array.isArray(body?.holdings) ? body.holdings : [];
    const asOfDate = String(body?.asOfDate || new Date().toISOString().slice(0, 10)).trim();
    const now = new Date().toISOString();
    const snapshot = {
      id: randomUUID(),
      fundId,
      holdings: holdings.map((h) => ({
        symbol: String(h.symbol || '').trim(),
        name: String(h.name || '').trim(),
        quantity: Number(h.quantity) || 0,
        weight: Number(h.weight) || 0,
      })),
      asOfDate,
      createdAt: now,
    };
    const result = await updateJsonStore(config, (store) => {
      if (!Array.isArray(store.productHoldings)) store.productHoldings = [];
      store.productHoldings.push(snapshot);
      if (!Array.isArray(store.adminAuditLogs)) store.adminAuditLogs = [];
      store.adminAuditLogs.push({
        id: randomUUID(),
        adminId: actor?.userId || null,
        action: 'holdings.upload',
        entityType: 'product_holdings',
        entityId: snapshot.id,
        before: null,
        after: { ...snapshot },
        reason: `Holdings uploaded for product ${fundId}`,
        ipAddress: String(headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
        userAgent: headers['user-agent'] || null,
        createdAt: now,
      });
      return snapshot;
    });
    return result;
  });

  router.post(Routes.POST_V1_ADMIN_PAYMENTS_PAYMENT_ID_RECONCILE, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Reconcile payment with reason.',
  }, ({ config, actor, params, body, headers }) => reconcilePayment(
    config,
    actor,
    params.payment_id,
    body,
    paymentReconcileRequestContext(headers),
  ));

  router.post(Routes.POST_V1_ADMIN_PAYMENTS_PAYMENT_ID_APPROVE, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Approve a settled payment and post it into the fund pool.',
  }, ({ config, actor, params, body, headers }) => approvePayment(
    config,
    actor,
    params.payment_id,
    body,
    paymentReconcileRequestContext(headers),
  ));

  router.post(Routes.POST_V1_ADMIN_PAYMENTS_PAYMENT_ID_REJECT, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Reject a payment after admin review.',
  }, ({ config, actor, params, body, headers }) => rejectPayment(
    config,
    actor,
    params.payment_id,
    body,
    paymentReconcileRequestContext(headers),
  ));

  router.get(Routes.GET_V1_ADMIN_RECONCILIATION_LEDGER, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'List reconciliation ledger entries.',
  }, async ({ config, query }) => listReconciliationLedger(config, {
    paymentId: query?.paymentId || null,
    limit: Math.min(100, Math.max(1, Number(query?.limit) || 50)),
  }));

  router.patch(Routes.PATCH_V1_ADMIN_MANDATES_MANDATE_ID, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Admin mandate state action.',
  }, ({ config, actor, params, body, headers }) => updateMandateStatus(config, actor, params.mandate_id, body, {
    ipAddress: String(headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
    userAgent: headers['user-agent'] || null,
  }));

  router.patch(Routes.PATCH_V1_ADMIN_SIP_CONTROL_REQUESTS_REQUEST_ID, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Review SIP control request.',
  }, ({ config, actor, params, body }) => reviewSipControlRequest(config, actor, params.request_id, body));

  router.get(Routes.GET_V1_ADMIN_TRANSACTIONS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Admin transaction list with fund pool filtering, search and pagination.',
  }, ({ config, query }) => adminTransactions(config, {
    fundId: query?.fundId || null,
    status: query?.status || null,
    type: query?.type || null,
    userId: query?.userId || null,
    q: query?.q || null,
    page: Number(query?.page) || 1,
    limit: Math.min(100, Math.max(1, Number(query?.limit) || 25)),
  }));
}

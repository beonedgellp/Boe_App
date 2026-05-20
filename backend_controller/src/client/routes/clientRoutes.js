import { Routes } from '#shared/routes/constants.js';
import { emptyCollection, placeholder } from '#shared/services/placeholderService.js';
import { validateBody } from '#http/validate.js';
import { withIdempotency } from '#http/idempotency.js';
import {
  listResearchContextFromAppConfig,
} from '#shared/services/appConfigService.js';
import {
  listFunds,
  getFund,
  toClientFunds,
  toClientFund,
  createRedemptionRequest,
  listRedemptionRequests,
} from '../services/fundsService.js';
import {
  createSip,
} from '../services/sipService.js';
import {
  getHolding,
} from '../services/portfolioService.js';
import {
  createLumpsumOrder,
  getOrder,
  payPendingInstallment,
} from '../services/orderService.js';
import {
  previewWithdrawal,
  createRedemption,
} from '../services/withdrawalService.js';
import {
  clientDashboard,
  clientPortfolio,
  clientOrders,
  clientTransactions,
  clientPayments,
  clientMandates,
  clientNotifications,
  clientSupportTickets,
} from '../services/clientDataService.js';
import {
  getPayment,
  confirmRazorpayPayment,
  retryPayment,
} from '../services/paymentService.js';
import {
  getTransaction,
} from '../services/transactionService.js';
import {
  listStatements,
  getStatement,
} from '../services/statementService.js';
import {
  getMandate,
  authorizeMandate,
} from '../services/mandateService.js';
import {
  requestSipControl,
  listSipControlRequests,
} from '../services/sipControlService.js';
import {
  getKycStatus,
  updateKycDepth,
} from '../services/kycService.js';
import {
  markNotificationRead,
} from '../services/notificationService.js';
import {
  createTicket,
  listFaqs,
} from '../services/supportService.js';
import { getTicketWithMessages } from '../services/supportTicketDetailService.js';
import { registerWebhookRoutes } from '#shared/routes/webhookRoutes.js';
import { registerClientReceiptRoutes } from '#shared/routes/receiptRoutes.js';
import { registerClientTimelineRoutes } from '#shared/routes/timelineRoutes.js';

const CLIENT_ROLES = ['client', 'admin'];

function readIdempotencyHeader(headers) {
  if (!headers) return null;
  const raw = headers['idempotency-key'] ?? headers['Idempotency-Key'];
  if (raw == null) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function registerClientRoutes(router) {
  // Provider webhooks (payments/mandates) + client-facing receipts/timeline belong to
  // the client/payment surface so an admin-only server doesn't expose them.
  registerWebhookRoutes(router);
  registerClientReceiptRoutes(router);
  registerClientTimelineRoutes(router);

  router.get(Routes.GET_V1_CLIENT_DASHBOARD, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client portfolio dashboard.',
  }, ({ config, actor }) => clientDashboard(config, actor.userId));

  router.get(Routes.GET_V1_CLIENT_PORTFOLIO, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client portfolio detail.',
  }, ({ config, actor }) => clientPortfolio(config, actor.userId));

  router.get(Routes.GET_V1_CLIENT_PORTFOLIO_HOLDINGS_FUND_ID, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Single client holding detail.',
  }, ({ config, actor, params }) => getHolding(config, actor, params.fund_id));

  router.get(Routes.GET_V1_CLIENT_RESEARCH_CONTEXT, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Published allocation/research context for client education.',
  }, ({ config }) => listResearchContextFromAppConfig(config));

  router.get(Routes.GET_V1_PRODUCTS, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Approved-client strategy list.',
  }, async ({ config }) => {
    const { items } = await listFunds(config);
    const clientItems = toClientFunds(items)
      .filter((f) => f.lifecycleStage === 'active' || f.lifecycleStage === 'published');
    return { items: clientItems, count: clientItems.length };
  });

  router.get(Routes.GET_V1_PRODUCTS_PRODUCT_ID, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Approved-client strategy detail.',
  }, async ({ config, params }) => {
    const fund = await getFund(config, params.product_id);
    return toClientFund(fund);
  });

  router.post(Routes.POST_V1_CLIENT_SIPS, {
    group: 'client',
    roles: CLIENT_ROLES,
    description: 'Create a SIP investment plan.',
  }, withIdempotency(Routes.POST_V1_CLIENT_SIPS, ({ config, actor, body, headers }) => {
    validateBody(body, {
      fundId: { required: true, type: 'string', minLength: 1 },
      amount: { required: true, type: 'number', min: 1 },
      frequency: { required: true, type: 'string', enum: ['monthly', 'weekly', 'quarterly'] },
      durationMonths: { required: true, type: 'number', min: 1, max: 360 },
    });
    return createSip(config, actor, body, {
      ipAddress: String(headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
      userAgent: headers['user-agent'] || null,
      idempotencyKey: readIdempotencyHeader(headers),
    });
  }));

  router.post(Routes.POST_V1_CLIENT_LUMPSUM_ORDERS, {
    group: 'client',
    roles: CLIENT_ROLES,
    description: 'Create a one-time investment order.',
  }, withIdempotency(Routes.POST_V1_CLIENT_LUMPSUM_ORDERS, ({ config, actor, body, headers }) => {
    validateBody(body, {
      fundId: { required: true, type: 'string', minLength: 1 },
      amount: { required: true, type: 'number', min: 1 },
    });
    return createLumpsumOrder(config, actor, body, {
      ipAddress: String(headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
      userAgent: headers['user-agent'] || null,
      idempotencyKey: readIdempotencyHeader(headers),
    });
  }));

  router.get(Routes.GET_V1_CLIENT_ORDERS, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client investment plan and order list.',
  }, ({ config, actor }) => clientOrders(config, actor.userId));

  router.get(Routes.GET_V1_CLIENT_ORDERS_ORDER_ID, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client order/transaction status.',
  }, ({ config, actor, params }) => getOrder(config, actor, params.order_id));

  router.post(Routes.POST_V1_CLIENT_ORDERS_ORDER_ID_PAY_PENDING_INSTALLMENT, {
    group: 'client',
    roles: CLIENT_ROLES,
    description: 'Retry a pending SIP installment.',
  }, withIdempotency(
    Routes.POST_V1_CLIENT_ORDERS_ORDER_ID_PAY_PENDING_INSTALLMENT,
    ({ config, actor, params, headers }) => payPendingInstallment(
      config,
      actor,
      params.order_id,
      { idempotencyKey: readIdempotencyHeader(headers) },
    ),
  ));

  router.get(Routes.GET_V1_CLIENT_PAYMENTS, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client payment list filtered by status.',
  }, ({ config, actor }) => clientPayments(config, actor.userId));

  router.get(Routes.GET_V1_CLIENT_PAYMENTS_PAYMENT_ID, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client payment status.',
  }, ({ config, actor, params }) => getPayment(config, actor, params.payment_id));

  router.post(Routes.POST_V1_CLIENT_PAYMENTS_PAYMENT_ID_CONFIRM_RAZORPAY, {
    group: 'client',
    roles: CLIENT_ROLES,
    description: 'Confirm Razorpay Checkout success response.',
  }, ({ config, actor, params, body }) => {
    validateBody(body, {
      razorpay_payment_id: { required: true, type: 'string', minLength: 1 },
      razorpay_order_id: { required: true, type: 'string', minLength: 1 },
      razorpay_signature: { required: true, type: 'string', minLength: 1 },
    });
    return confirmRazorpayPayment(config, actor, params.payment_id, body);
  });

  router.post(Routes.POST_V1_CLIENT_PAYMENTS_PAYMENT_ID_RETRY, {
    group: 'client',
    roles: CLIENT_ROLES,
    description: 'Retry a failed or expired payment.',
  }, withIdempotency(
    Routes.POST_V1_CLIENT_PAYMENTS_PAYMENT_ID_RETRY,
    ({ config, actor, params, headers }) => retryPayment(
      config,
      actor,
      params.payment_id,
      { idempotencyKey: readIdempotencyHeader(headers) },
    ),
  ));

  router.get(Routes.GET_V1_CLIENT_MANDATES, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client UPI AutoPay mandates.',
  }, ({ config, actor }) => clientMandates(config, actor.userId));

  router.get(Routes.GET_V1_CLIENT_MANDATES_MANDATE_ID, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client mandate detail.',
  }, ({ config, actor, params }) => getMandate(config, actor, params.mandate_id));

  router.post(Routes.POST_V1_CLIENT_MANDATES_MANDATE_ID_AUTHORIZE, {
    group: 'client',
    roles: CLIENT_ROLES,
    description: 'Start or continue mandate user authorization.',
  }, ({ config, actor, params }) => authorizeMandate(config, actor, params.mandate_id));

  router.post(Routes.POST_V1_CLIENT_SIP_CONTROL_REQUESTS, {
    group: 'client',
    roles: CLIENT_ROLES,
    description: 'Request SIP pause, skip, step-up, change, or cancel.',
  }, ({ config, actor, body }) => {
    validateBody(body, {
      planId: { required: true, type: 'string', minLength: 1 },
      action: { required: true, type: 'string', enum: ['pause', 'resume', 'skip', 'step_up', 'change_amount', 'cancel'] },
      reason: { required: false, type: 'string' },
      confirmed: { required: false, type: 'boolean' },
    });
    return requestSipControl(config, actor, body.planId, body.action, body.reason, body.confirmed);
  });

  router.get(Routes.GET_V1_CLIENT_SIP_CONTROL_REQUESTS, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client SIP control request list.',
  }, ({ config, actor }) => listSipControlRequests(config, actor));

  router.get(Routes.GET_V1_CLIENT_TRANSACTIONS, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client transaction ledger.',
  }, ({ config, actor }) => clientTransactions(config, actor.userId));

  router.get(Routes.GET_V1_CLIENT_TRANSACTIONS_TRANSACTION_ID, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client transaction detail.',
  }, ({ config, actor, params }) => getTransaction(config, actor, params.transaction_id));

  router.get(Routes.GET_V1_CLIENT_STATEMENTS, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client generated statements.',
  }, ({ config, actor }) => listStatements(config, actor));

  router.get(Routes.GET_V1_CLIENT_STATEMENTS_STATEMENT_ID, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client statement detail.',
  }, ({ config, actor, params }) => getStatement(config, actor, params.statement_id));

  router.get(Routes.GET_V1_CLIENT_NOTIFICATIONS, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client notifications.',
  }, ({ config, actor }) => clientNotifications(config, actor.userId));

  router.patch(Routes.PATCH_V1_CLIENT_NOTIFICATIONS_NOTIFICATION_ID, {
    group: 'client',
    roles: CLIENT_ROLES,
    description: 'Mark a notification read or update client notification state.',
  }, ({ config, actor, params }) => markNotificationRead(config, actor, params.notification_id));

  router.get(Routes.GET_V1_CLIENT_KYC_STATUS, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client KYC status.',
  }, ({ config, actor }) => getKycStatus(config, actor));

  router.post(Routes.POST_V1_CLIENT_KYC_DEPTH, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Update FATCA, nominee, and re-KYC depth data.',
  }, ({ config, actor, body }) => updateKycDepth(config, actor, body));

  router.get(Routes.GET_V1_CLIENT_SUPPORT_FAQS, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client support FAQ list.',
  }, ({ config }) => listFaqs(config));

  router.get(Routes.GET_V1_CLIENT_SUPPORT_TICKETS, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client support ticket list.',
  }, ({ config, actor }) => clientSupportTickets(config, actor.userId));

  router.post(Routes.POST_V1_CLIENT_SUPPORT_TICKETS, {
    group: 'client',
    roles: CLIENT_ROLES,
    description: 'Create a support ticket.',
  }, ({ config, actor, body }) => {
    validateBody(body, {
      title: { required: false, type: 'string', maxLength: 200 },
      subject: { required: false, type: 'string', maxLength: 200 },
      description: { required: false, type: 'string', maxLength: 2000 },
      body: { required: false, type: 'string', maxLength: 2000 },
      category: { required: false, type: 'string', enum: ['general', 'technical', 'billing', 'kyc', 'sip', 'withdrawal', 'mandate'] },
      priority: { required: false, type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
    });
    return createTicket(config, actor, body);
  });

  router.get(Routes.GET_V1_CLIENT_SUPPORT_TICKETS_TICKET_ID, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Client support ticket detail with messages.',
  }, ({ config, actor, params }) => getTicketWithMessages(config, actor, params.ticket_id));

  /* ----- Withdrawal / Redemption APIs ----- */

  router.get(Routes.GET_V1_CLIENT_WITHDRAWALS_PREVIEW, {
    group: 'client',
    roles: CLIENT_ROLES,
    description: 'Preview withdrawal with tax assumptions.',
  }, ({ config, actor, query, body }) => previewWithdrawal(config, actor, query.holdingId, Number(query.amount), body?.previewDate));

  router.post(Routes.POST_V1_CLIENT_WITHDRAWALS, {
    group: 'client',
    roles: CLIENT_ROLES,
    description: 'Create a redemption request from a preview.',
  }, ({ config, actor, body }) => {
    validateBody(body, {
      previewId: { required: true, type: 'string', minLength: 1 },
    });
    return createRedemption(config, actor, body.previewId);
  });

  router.post(Routes.POST_V1_CLIENT_REDEMPTIONS, {
    group: 'client',
    roles: CLIENT_ROLES,
    description: 'Create a redemption request.',
  }, ({ config, actor, body }) => {
    validateBody(body, {
      holdingId: { required: true, type: 'string', minLength: 1 },
      amount: { required: true, type: 'number', min: 1 },
      reason: { required: false, type: 'string', maxLength: 500 },
    });
    return createRedemptionRequest(config, actor.userId, body);
  });

  router.get(Routes.GET_V1_CLIENT_REDEMPTIONS, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'List client redemption requests.',
  }, ({ config, actor }) => listRedemptionRequests(config, { userId: actor.userId }));
}

import type { AdminPaymentFilters } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { emptyCollection } from '#shared/services/placeholderService.js';
import { readJsonStore } from '#db/pgAdapter.js';

function userPortfolioKey(userId: string) {
  return `portfolio_${userId}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fundName(store: any, fundId: string) {
  const fund = (store.funds || []).find((item: Record<string, any>) => item.id === fundId);
  return fund?.name || fund?.title || fundId || 'BeOnEdge Strategy';
}

function fundTrackingId(fund: any) {
  if (!fund?.id) return '';
  return fund.trackingId || fund.fundCode || `FP-${String(fund.id).replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

function fundSnapshot(store: any, fundId: string) {
  const fund = (store.funds || []).find((item: Record<string, any>) => item.id === fundId);
  if (!fund) {
    return fundId ? { id: fundId, name: fundId, title: fundId, trackingId: fundId, fundCode: fundId } : null;
  }
  const trackingId = fundTrackingId(fund);
  return {
    id: fund.id,
    name: fund.name || fund.title || fund.id,
    title: fund.title || fund.name || fund.id,
    trackingId,
    fundCode: trackingId,
    status: fund.status || '',
    lifecycleStage: fund.lifecycleStage || '',
    riskLabel: fund.riskLabel || '',
    minSip: fund.minSip ?? null,
    minLumpsum: fund.minLumpsum ?? null,
    totalPoolSize: fund.totalPoolSize ?? null,
  };
}

function findPaymentForTransaction(store: any, transaction: any) {
  if (!transaction) return null;
  return (store.payments || [])
    .filter((payment: any) => payment.transactionId === transaction.id)
    .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())[0] || null;
}

function visibleTransactionType(type: any) {
  const value = String(type || '').toLowerCase();
  if (value === 'sip' || value === 'sip_installment' || value === 'installment') return 'sip';
  if (value === 'lumpsum' || value === 'one_time' || value === 'one-time') return 'lumpsum';
  return value;
}

function paymentTypeFrom(mode: any, type: any) {
  const value = String(mode || '').toLowerCase();
  if (value.includes('autopay') || value.includes('mandate')) return 'autopay';
  if (visibleTransactionType(type) === 'sip' && !value) return 'autopay';
  return 'manual';
}

function clientTransactionStatus(transaction: any, payment: any) {
  if (payment?.status === 'approved') return 'approved';
  if (payment?.status === 'rejected') return 'approval_rejected';
  if (payment?.status === 'success' || payment?.status === 'confirmed' || payment?.status === 'reconciled') {
    return 'awaiting_approval';
  }
  if (payment?.status === 'failed' || payment?.status === 'expired') return 'payment_failed';
  if (payment?.status === 'created' || payment?.status === 'gateway_initiated' || payment?.status === 'pending') {
    return 'payment_pending';
  }
  if (transaction?.status === 'payment_confirmed') return 'awaiting_approval';
  return transaction?.status || 'submitted';
}

function enrichTransaction(store: any, transaction: any) {
  const payment = findPaymentForTransaction(store, transaction);
  const plan = findPlanForPayment(store, payment || {}, transaction);
  const productId = transaction.productId || transaction.fundId || payment?.fundId || payment?.productId || plan?.productId || plan?.fundId || '';
  const fund = fundSnapshot(store, productId);
  const type = visibleTransactionType(transaction.type || plan?.type);
  const mode = payment?.mode || transaction.mode || '';
  return {
    ...transaction,
    productId,
    fundId: productId,
    fund,
    fundName: fund?.name || fundName(store, productId),
    type,
    rawType: transaction.type,
    status: clientTransactionStatus(transaction, payment),
    transactionStatus: transaction.status || '',
    paymentId: payment?.id || null,
    paymentStatus: payment?.status || null,
    paymentType: paymentTypeFrom(mode, type),
    payment: payment ? {
      id: payment.id,
      status: payment.status || '',
      mode: payment.mode || '',
      provider: payment.provider || '',
      providerOrderId: payment.providerOrderId || '',
      providerPaymentId: payment.providerPaymentId || '',
      amount: payment.amount ?? null,
      currency: payment.currency || 'INR',
      confirmedAt: payment.confirmedAt || null,
      approvedAt: payment.approvedAt || null,
      rejectedAt: payment.rejectedAt || null,
    } : null,
    plan: plan ? {
      id: plan.id,
      type: visibleTransactionType(plan.type),
      status: plan.status || '',
      amount: plan.amount ?? null,
      durationMonths: plan.durationMonths ?? null,
      debitDay: plan.debitDay ?? null,
      mandateId: plan.mandateId || null,
    } : null,
    paymentFailureReason: payment?.failureReason || payment?.lastFailureReason || null,
    approvalStatus: payment?.status === 'approved'
      ? 'approved'
      : payment?.status === 'rejected'
        ? 'rejected'
        : ['success', 'confirmed', 'reconciled'].includes(payment?.status)
          ? 'waiting_admin_approval'
          : null,
    approvedAt: payment?.approvedAt || null,
    rejectedAt: payment?.rejectedAt || null,
    reference: payment?.providerPaymentId || payment?.providerOrderId || transaction.reference || transaction.id,
    mode,
    failureReason: payment?.failureReason || payment?.lastFailureReason || transaction.failureReason || '',
  };
}

function findTransactionForPayment(store: any, payment: any) {
  return (store.transactions || []).find((transaction: any) => transaction.id === payment.transactionId) || null;
}

function findPlanForPayment(store: any, payment: any, transaction: any) {
  const plans = store.investmentPlans || store.orders || [];
  if (transaction?.investmentPlanId) {
    const byTransaction = plans.find((plan: any) => plan.id === transaction.investmentPlanId);
    if (byTransaction) return byTransaction;
  }
  if (payment?.investmentPlanId) {
    const byPayment = plans.find((plan: any) => plan.id === payment.investmentPlanId);
    if (byPayment) return byPayment;
  }
  if (payment?.id) {
    const byPaymentId = plans.find((plan: any) => plan.paymentId === payment.id);
    if (byPaymentId) return byPaymentId;
  }
  return null;
}

function enrichPayment(store: any, payment: any) {
  const transaction = findTransactionForPayment(store, payment);
  const plan = findPlanForPayment(store, payment, transaction);
  const productId = payment.fundId || payment.productId || transaction?.productId || plan?.productId || plan?.fundId || '';
  const fund = fundSnapshot(store, productId);
  const type = visibleTransactionType(transaction?.type || plan?.type);
  const mode = payment.mode || transaction?.mode || '';
  return {
    ...payment,
    paymentId: payment.id,
    orderId: plan?.id || payment.orderId || '',
    planId: plan?.id || null,
    fundId: productId,
    fund,
    fundName: fund?.name || fundName(store, productId),
    type,
    paymentType: paymentTypeFrom(mode, type),
    amount: Number(payment.amount ?? transaction?.amount ?? plan?.amount ?? 0),
    date: payment.createdAt || transaction?.date || transaction?.createdAt || '',
    dueDate: plan?.nextDueDate || payment.dueDate || payment.createdAt || '',
    reason: payment.failureReason || payment.lastFailureReason || payment.rejectionReason || '',
    transactionId: transaction?.id || payment.transactionId || null,
    transactionStatus: transaction?.status || null,
    transaction: transaction ? {
      id: transaction.id,
      type,
      rawType: transaction.type || '',
      status: transaction.status || '',
      amount: transaction.amount ?? null,
      date: transaction.date || transaction.createdAt || '',
    } : null,
    plan: plan ? {
      id: plan.id,
      type: visibleTransactionType(plan.type),
      status: plan.status || '',
      amount: plan.amount ?? null,
      durationMonths: plan.durationMonths ?? null,
      debitDay: plan.debitDay ?? null,
      mandateId: plan.mandateId || null,
    } : null,
    approvalStatus: payment.status === 'approved'
      ? 'approved'
      : payment.status === 'rejected'
        ? 'rejected'
        : ['success', 'confirmed', 'reconciled'].includes(payment.status)
          ? 'waiting_admin_approval'
          : null,
  };
}

export async function clientDashboard(config: AppConfig, userId: string) {
  const store = await readJsonStore(config);
  const user = store.users.find((u) => u.id === userId);
  const portfolio = store[userPortfolioKey(userId)] || {
    invested: 0,
    asOf: new Date().toISOString(),
    holdings: [],
  };

  const orders = (store.investmentPlans || store.orders || []).filter((o) => o.userId === userId);
  const activeOrders = orders.filter((o) => o.status === 'active' || o.status === 'pending_first_payment');
  const transactions = (store.transactions || []).filter((t) => t.userId === userId);
  const recentTransactions = transactions.slice(0, 5);
  const notifications = (store.notifications || [])
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return {
    source: 'json',
    portfolio,
    activeOrders,
    recentTransactions,
    notifications,
  };
}

export async function clientPortfolio(config: AppConfig, userId: string) {
  const store = await readJsonStore(config);
  const portfolio = store[userPortfolioKey(userId)] || {
    invested: 0,
    asOf: new Date().toISOString(),
    holdings: [],
  };

  return { source: 'json', ...portfolio };
}

export async function clientOrders(config: AppConfig, userId: string) {
  const store = await readJsonStore(config);
  const items = (store.investmentPlans || store.orders || []).filter((o) => o.userId === userId);
  return { items, count: items.length, source: 'json' };
}

export async function clientTransactions(config: AppConfig, userId: string) {
  const store = await readJsonStore(config);
  const items = (store.transactions || [])
    .filter((t) => t.userId === userId)
    .map((transaction) => enrichTransaction(store, transaction))
    .sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
  return { items, count: items.length, source: 'json' };
}

export async function clientPayments(config: AppConfig, userId: string, filters: Record<string, string> = {}) {
  const store = await readJsonStore(config);
  const status = String(filters.status || '').trim();
  const statuses = status
    ? status.split(',').map((item) => item.trim()).filter(Boolean)
    : [];
  let items = (store.payments || [])
    .filter((p) => p.userId === userId)
    .map((payment) => enrichPayment(store, payment))
    .sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
  if (statuses.length) items = items.filter((payment) => statuses.includes(payment.status));
  return { items, count: items.length, source: 'json' };
}

export async function clientMandates(config: AppConfig, userId: string) {
  const store = await readJsonStore(config);
  const items = (store.mandates || []).filter((m) => m.userId === userId);
  return { items, count: items.length, source: 'json' };
}

export async function clientNotifications(config: AppConfig, userId: string) {
  const store = await readJsonStore(config);
  const items = (store.notifications || [])
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { items, count: items.length, source: 'json' };
}

export async function clientSupportTickets(config: AppConfig, userId: string) {
  const store = await readJsonStore(config);
  const items = (store.supportTickets || [])
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { items, count: items.length, source: 'json' };
}

import type { AdminPaymentFilters } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import type { FundRow } from '#types/models.js';
import { emptyCollection } from '#shared/services/placeholderService.js';
import { prisma } from '#db/prisma.js';

export async function clientDashboard(config: AppConfig, userId: string) {
  const [user, orders, transactions, notifications] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId } }),
    prisma.investmentPlan.findMany({ where: { userId } }),
    prisma.transaction.findMany({ where: { userId }, take: 5, orderBy: { createdAt: 'desc' } }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);

  const activeOrders = orders.filter((o) => o.status === 'active' || o.status === 'pending_first_payment');

  return {
    source: 'prisma',
    portfolio: { invested: 0, asOf: new Date().toISOString(), holdings: [] },
    activeOrders,
    recentTransactions: transactions,
    notifications,
  };
}

export async function clientPortfolio(config: AppConfig, userId: string) {
  return { source: 'prisma', invested: 0, asOf: new Date().toISOString(), holdings: [] };
}

export async function clientOrders(config: AppConfig, userId: string) {
  const items = await prisma.investmentPlan.findMany({ where: { userId } });
  return { items, count: items.length, source: 'prisma' };
}

export async function clientTransactions(config: AppConfig, userId: string) {
  const items = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return { items, count: items.length, source: 'prisma' };
}

export async function clientPayments(config: AppConfig, userId: string, filters: Record<string, string> = {}) {
  const status = String(filters.status || '').trim();
  const statuses = status
    ? status.split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  const where: any = { userId };
  if (statuses.length) {
    where.status = { in: statuses };
  }

  const items = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return { items, count: items.length, source: 'prisma' };
}

export async function clientMandates(config: AppConfig, userId: string) {
  const items = await prisma.mandate.findMany({ where: { userId } });
  return { items, count: items.length, source: 'prisma' };
}

export async function clientNotifications(config: AppConfig, userId: string) {
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return { items, count: items.length, source: 'prisma' };
}

export async function clientSupportTickets(config: AppConfig, userId: string) {
  const items = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return { items, count: items.length, source: 'prisma' };
}

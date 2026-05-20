import { emptyCollection } from '../../shared/services/placeholderService.js';
import { jsonStoreEnabled, readJsonStore } from '../../db/jsonStore.js';

function userPortfolioKey(userId) {
  return `portfolio_${userId}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function clientDashboard(config, userId) {
  if (!jsonStoreEnabled(config)) {
    return {
      source: 'postgres_pending',
      portfolio: null,
      activeOrders: [],
      recentTransactions: [],
      notifications: [],
    };
  }

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
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  return {
    source: 'json',
    portfolio,
    activeOrders,
    recentTransactions,
    notifications,
  };
}

export async function clientPortfolio(config, userId) {
  if (!jsonStoreEnabled(config)) {
    return {
      source: 'postgres_pending',
      currentValue: 0,
      invested: 0,
      allTimeGain: 0,
      allTimeGainPct: 0,
      todayChange: 0,
      xirrPct: 0,
      asOf: new Date().toISOString(),
      holdings: [],
    };
  }

  const store = await readJsonStore(config);
  const portfolio = store[userPortfolioKey(userId)] || {
    invested: 0,
    asOf: new Date().toISOString(),
    holdings: [],
  };

  return { source: 'json', ...portfolio };
}

export async function clientOrders(config, userId) {
  if (!jsonStoreEnabled(config)) return emptyCollection({ source: 'postgres_pending' });
  const store = await readJsonStore(config);
  const items = (store.investmentPlans || store.orders || []).filter((o) => o.userId === userId);
  return { items, count: items.length, source: 'json' };
}

export async function clientTransactions(config, userId) {
  if (!jsonStoreEnabled(config)) return emptyCollection({ source: 'postgres_pending' });
  const store = await readJsonStore(config);
  const items = (store.transactions || []).filter((t) => t.userId === userId);
  return { items, count: items.length, source: 'json' };
}

export async function clientPayments(config, userId) {
  if (!jsonStoreEnabled(config)) return emptyCollection({ source: 'postgres_pending' });
  const store = await readJsonStore(config);
  const items = (store.payments || []).filter((p) => p.userId === userId);
  return { items, count: items.length, source: 'json' };
}

export async function clientMandates(config, userId) {
  if (!jsonStoreEnabled(config)) return emptyCollection({ source: 'postgres_pending' });
  const store = await readJsonStore(config);
  const items = (store.mandates || []).filter((m) => m.userId === userId);
  return { items, count: items.length, source: 'json' };
}

export async function clientNotifications(config, userId) {
  if (!jsonStoreEnabled(config)) return emptyCollection({ source: 'postgres_pending' });
  const store = await readJsonStore(config);
  const items = (store.notifications || [])
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { items, count: items.length, source: 'json' };
}

export async function clientSupportTickets(config, userId) {
  if (!jsonStoreEnabled(config)) return emptyCollection({ source: 'postgres_pending' });
  const store = await readJsonStore(config);
  const items = (store.supportTickets || [])
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { items, count: items.length, source: 'json' };
}

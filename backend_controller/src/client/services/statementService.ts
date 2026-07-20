import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { HttpError } from '#http/errors.js';
import { readJsonStore } from '#db/pgAdapter.js';

function getMonthKey(dateStr: any) {
  return dateStr.slice(0, 7); // YYYY-MM
}

function buildStatementId(userId: string, monthKey: any) {
  return `stmt_${monthKey}_${userId}`;
}

function parseStatementId(statementId: string) {
  const match = statementId.match(/^stmt_(\d{4}-\d{2})_(.+)$/);
  if (!match) return null;
  return { monthKey: match[1], userId: match[2] };
}

function buildStatement(userId: string, monthKey: any, transactions: any) {
  const [year, month] = monthKey.split('-').map(Number);
  const periodStart = `${monthKey}-01`;
  const periodEnd = new Date(year, month, 0).toISOString().slice(0, 10);

  const totalAmount = transactions.reduce((sum: any, t: any) => sum + (t.amount || 0), 0);
  const totalUnits = transactions.reduce((sum: any, t: any) => sum + (t.units || 0), 0);

  return {
    id: buildStatementId(userId, monthKey),
    userId,
    label: `Statement for ${monthKey}`,
    periodStart,
    periodEnd,
    generatedAt: new Date().toISOString(),
    lineItems: transactions.map((t: any) => ({
      transactionId: t.id,
      date: t.date,
      type: t.type,
      fundName: t.fundName,
      amount: t.amount,
      units: t.units,
      nav: t.nav,
      status: t.status,
      reference: t.reference,
    })),
    summary: {
      totalTransactions: transactions.length,
      totalAmount,
      totalUnits,
      currency: 'INR',
    },
  };
}

export async function listStatements(config: AppConfig, actor: Actor) {
  const store = await readJsonStore(config);
  const userTxns = (store.transactions || []).filter((t) => t.userId === actor?.userId);

  const byMonth: Record<string, any[]> = {};
  for (const t of userTxns) {
    const key = getMonthKey(t.date);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(t);
  }

  const items = Object.entries(byMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, transactions]) => buildStatement(actor?.userId, monthKey, transactions));

  return { items, count: items.length, page: 1, pageSize: items.length, total: items.length, source: 'json' };
}

export async function getStatement(config: AppConfig, actor: Actor, statementId: string) {
  const parsed = parseStatementId(statementId);
  if (!parsed) throw new HttpError(404, 'STATEMENT_NOT_FOUND', 'Statement not found.');
  if (parsed.userId !== actor?.userId) throw new HttpError(403, 'FORBIDDEN', 'Statement does not belong to you.');

  const store = await readJsonStore(config);
  const transactions = (store.transactions || []).filter(
    (t) => t.userId === actor?.userId && getMonthKey(t.date) === parsed.monthKey,
  );

  if (transactions.length === 0) {
    throw new HttpError(404, 'STATEMENT_NOT_FOUND', 'Statement not found.');
  }

  return buildStatement(actor?.userId, parsed.monthKey, transactions);
}

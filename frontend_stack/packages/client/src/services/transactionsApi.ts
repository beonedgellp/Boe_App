import { fixtureTransactions } from '../data/fixtureTransactions';
import { apiRequest, clone, delay, listFromPayload, useHttpApi } from './_util';

function transactionType(transaction) {
  const type = String(transaction?.type || transaction?.rawType || transaction?.planType || '').toLowerCase();
  if (type === 'sip' || type === 'sip_installment' || type === 'installment') return 'sip';
  if (type === 'lumpsum' || type === 'one_time' || type === 'one-time') return 'lumpsum';
  return type;
}

function applyFilter(items, filter) {
  if (filter === 'sip') return items.filter((transaction) => transactionType(transaction) === 'sip');
  if (filter === 'lumpsum') return items.filter((transaction) => transactionType(transaction) === 'lumpsum');
  if (filter === 'pending') {
    return items.filter((transaction) => (transaction as any).status === 'payment_pending' || (transaction as any).status === 'pending');
  }
  if (filter === 'failed') {
    return items.filter((transaction) => (
      (transaction as any).status === 'payment_failed' ||
      (transaction as any).status === 'approval_rejected' ||
      (transaction as any).status === 'failed'
    ));
  }
  if (filter === 'approval') return items.filter((transaction) => (transaction as any).status === 'awaiting_approval');
  return items;
}

export async function listTransactions({ filter = 'all', from, to }: any = {}) {
  if (useHttpApi()) {
    const params = new URLSearchParams({ filter });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const items = listFromPayload(await apiRequest(`/v1/client/transactions?${params.toString()}`));
    return applyFilter(items, filter);
  }

  await delay();
  const out = applyFilter(fixtureTransactions, filter);
  return clone(out);
}

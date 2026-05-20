import { fixtureTransactions } from '../data/fixtureTransactions.js';
import { apiRequest, clone, delay, listFromPayload, useHttpApi } from './_util.js';

export async function listTransactions({ filter = 'all', from, to } = {}) {
  if (useHttpApi()) {
    const params = new URLSearchParams({ filter });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return listFromPayload(await apiRequest(`/v1/client/transactions?${params.toString()}`));
  }

  await delay();
  let out = fixtureTransactions;
  if (filter === 'sip') out = out.filter((t) => t.type === 'sip');
  if (filter === 'lumpsum') out = out.filter((t) => t.type === 'lumpsum');
  if (filter === 'pending') out = out.filter((t) => t.status === 'pending');
  return clone(out);
}



import { HttpError } from '../../http/errors.js';
import { jsonStoreEnabled, findRecord } from '../../db/jsonStore.js';

export async function getTransaction(config, actor, transactionId) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for transactions is not yet implemented.');
  }
  const { item: tx } = await findRecord(config, 'transactions', (t) => t.id === transactionId);
  if (!tx) throw new HttpError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found.');
  if (tx.userId !== actor?.userId) throw new HttpError(403, 'FORBIDDEN', 'Transaction does not belong to you.');
  return tx;
}

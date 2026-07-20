import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { HttpError } from '#http/errors.js';
import { findRecord } from '#db/pgAdapter.js';

export async function getTransaction(config: AppConfig, actor: Actor, transactionId: string) {
  const { item: tx } = await findRecord(config, 'transactions', (t) => t.id === transactionId);
  if (!tx) throw new HttpError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found.');
  if (tx.userId !== actor?.userId) throw new HttpError(403, 'FORBIDDEN', 'Transaction does not belong to you.');
  return tx;
}

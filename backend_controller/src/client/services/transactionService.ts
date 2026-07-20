import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';

export async function getTransaction(config: AppConfig, actor: Actor, transactionId: string) {
  const tx = await prisma.transaction.findFirst({ where: { id: transactionId } });
  if (!tx) throw new HttpError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found.');
  if (tx.userId !== actor?.userId) throw new HttpError(403, 'FORBIDDEN', 'Transaction does not belong to you.');
  return tx;
}

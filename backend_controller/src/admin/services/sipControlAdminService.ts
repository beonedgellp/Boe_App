import type { RequestContext } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';

export async function reviewSipControlRequest(config: AppConfig, actor: Actor, requestId: string, body: Record<string, unknown> = {}) {
  const nextStatus = String(body.status || '').trim().toLowerCase();
  if (!['approved', 'rejected'].includes(nextStatus)) {
    throw new HttpError(400, 'INVALID_STATUS', 'Status must be approved or rejected.');
  }

  const request = await prisma.sipControlRequest.findFirst({ where: { id: requestId } });
  if (!request) throw new HttpError(404, 'REQUEST_NOT_FOUND', 'SIP control request not found.');

  const now = new Date();

  const updated = await prisma.sipControlRequest.update({
    where: { id: requestId },
    data: {
      status: nextStatus,
      reviewedAt: now,
      updatedAt: now,
    },
  });

  return updated;
}

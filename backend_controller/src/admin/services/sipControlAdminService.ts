import type { RequestContext } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { HttpError } from '#http/errors.js';
import { updateSipControlRequest } from '#db/pgAdapter.js';

export async function reviewSipControlRequest(config: AppConfig, actor: Actor, requestId: string, body: Record<string, unknown> = {}) {
  const nextStatus = String(body.status || '').trim().toLowerCase();
  if (!['approved', 'rejected'].includes(nextStatus)) {
    throw new HttpError(400, 'INVALID_STATUS', 'Status must be approved or rejected.');
  }

  const updated = await updateSipControlRequest(config, requestId, (request) => {
    if (!request) return null;
    const now = new Date().toISOString();
    request.status = nextStatus;
    request.reviewedAt = now;
    request.updatedAt = now;
    return request;
  });

  if (!updated) throw new HttpError(404, 'REQUEST_NOT_FOUND', 'SIP control request not found.');
  return updated;
}

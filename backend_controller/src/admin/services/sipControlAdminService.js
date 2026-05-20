import { HttpError } from '../../http/errors.js';
import { jsonStoreEnabled, updateSipControlRequest } from '../../db/jsonStore.js';

export async function reviewSipControlRequest(config, actor, requestId, body = {}) {
  const nextStatus = String(body.status || '').trim().toLowerCase();
  if (!['approved', 'rejected'].includes(nextStatus)) {
    throw new HttpError(400, 'INVALID_STATUS', 'Status must be approved or rejected.');
  }

  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for SIP control requests is not yet implemented.');
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

import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { jsonStoreEnabled, findRecord, updateMandate } from '#db/jsonStore.js';
import { withReceipt } from '#shared/services/withReceipt.js';

export async function getMandate(config, actor, mandateId) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for mandates is not yet implemented.');
  }
  const { item: mandate } = await findRecord(config, 'mandates', (m) => m.id === mandateId);
  if (!mandate) throw new HttpError(404, 'MANDATE_NOT_FOUND', 'Mandate not found.');
  if (mandate.userId !== actor?.userId) throw new HttpError(403, 'FORBIDDEN', 'Mandate does not belong to you.');
  return mandate;
}

async function _authorizeMandate(config, actor, mandateId) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for mandates is not yet implemented.');
  }

  const result = await updateMandate(config, mandateId, (mandate, store) => {
    if (mandate.userId !== actor?.userId) {
      throw new HttpError(403, 'FORBIDDEN', 'Mandate does not belong to you.');
    }
    const owner = store.users.find((user) => user.id === mandate.userId);
    if (!owner || owner.status !== 'approved') {
      throw new HttpError(403, 'USER_NOT_APPROVED', 'User must be approved to authorize a mandate.', {
        status: owner?.status || 'missing',
      });
    }
    if (mandate.provider !== 'mock') {
      throw new HttpError(400, 'MANDATE_PROVIDER_NOT_MOCK', 'Can only authorize mock mandates');
    }
    if (!['setup_required', 'pending_user_auth'].includes(mandate.status)) {
      throw new HttpError(400, 'MANDATE_NOT_AUTHORIZABLE', 'Mandate cannot be authorized from its current state.');
    }
    const now = new Date().toISOString();
    const before = { ...mandate };
    mandate.status = 'active';
    mandate.authorizedAt = now;
    mandate.updatedAt = now;
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'mandate.authorize',
      entityType: 'mandate',
      entityId: mandate.id,
      before,
      after: { ...mandate },
      reason: 'Client authorized mandate.',
      ipAddress: null,
      userAgent: null,
      createdAt: now,
    });
    return mandate;
  });

  if (!result) throw new HttpError(404, 'MANDATE_NOT_FOUND', 'Mandate not found.');
  return result;
}

export const authorizeMandate = withReceipt(_authorizeMandate, 'mandate_authorized', {
  entityType: 'mandate',
  entityId: (result) => result.id,
  afterState: (result) => result.status,
  source: 'mock',
});

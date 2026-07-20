import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { updateJsonStore } from '#db/pgAdapter.js';
import { withReceipt } from '#shared/services/withReceipt.js';

const VALID_MANDATE_STATUSES = new Set([
  'setup_required',
  'pending_user_auth',
  'active',
  'paused',
  'cancelled',
  'failed',
]);

const ADMIN_TRANSITIONS = {
  pause: { from: new Set(['active']), to: 'paused' },
  resume: { from: new Set(['paused']), to: 'active' },
  cancel: { from: new Set(['setup_required', 'pending_user_auth', 'active', 'paused', 'failed']), to: 'cancelled' },
};

function toTrimmedString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

async function _updateMandateStatus(config, actor, mandateId, body, requestContext: any = {}) {
  const action = toTrimmedString(body?.action).toLowerCase();
  const reason = toTrimmedString(body?.reason);

  const transition = ADMIN_TRANSITIONS[action];
  if (!transition) {
    throw new HttpError(400, 'INVALID_ACTION', 'Action must be one of: pause, resume, cancel.');
  }

  if (action === 'cancel' && !reason) {
    throw new HttpError(400, 'REASON_REQUIRED', 'Reason is required for mandate cancellation.');
  }

  const now = new Date().toISOString();

  const result = await updateJsonStore(config, (store) => {
    const idx = (store.mandates || []).findIndex((m) => m.id === mandateId);
    if (idx === -1) return null;

    const mandate = store.mandates[idx];

    if (!VALID_MANDATE_STATUSES.has(mandate.status)) {
      throw new HttpError(400, 'INVALID_MANDATE_STATUS', `Mandate has unrecognized status: ${mandate.status}`);
    }

    if (!transition.from.has(mandate.status)) {
      throw new HttpError(400, 'INVALID_TRANSITION', `Cannot ${action} a mandate with status '${mandate.status}'.`);
    }

    const before = { ...mandate };
    mandate.status = transition.to;
    mandate.updatedAt = now;

    if (action === 'cancel') {
      mandate.cancelledAt = now;
      mandate.cancelledBy = actor?.userId || null;
      mandate.cancelReason = reason;
    }

    if (action === 'pause') {
      mandate.pausedAt = now;
      mandate.pausedBy = actor?.userId || null;
    }

    if (action === 'resume') {
      mandate.resumedAt = now;
      mandate.resumedBy = actor?.userId || null;
    }

    if (!Array.isArray(store.adminAuditLogs)) store.adminAuditLogs = [];
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: `mandate.${action}`,
      entityType: 'mandate',
      entityId: mandate.id,
      before,
      after: { ...mandate },
      reason: reason || `Admin ${action}d mandate.`,
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      createdAt: now,
    });

    return { ...mandate };
  });

  if (!result) throw new HttpError(404, 'MANDATE_NOT_FOUND', `Mandate ${mandateId} not found.`);
  return result;
}

export const updateMandateStatus = withReceipt(_updateMandateStatus, 'mandate_updated', {
  entityType: 'mandate',
  entityId: (result) => result.id,
  afterState: (result) => result.status,
  subjectUserId: (result) => result.userId,
  source: 'derived',
});

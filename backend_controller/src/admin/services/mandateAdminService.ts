import type { MandateAdminBody, RequestContext } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';
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

function toTrimmedString(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

async function _updateMandateStatus(config: AppConfig, actor: Actor, mandateId: string, body: MandateAdminBody, requestContext: RequestContext = {}) {
  const action = toTrimmedString(body?.action).toLowerCase();
  const reason = toTrimmedString(body?.reason);

  const transition = ADMIN_TRANSITIONS[action as keyof typeof ADMIN_TRANSITIONS];
  if (!transition) {
    throw new HttpError(400, 'INVALID_ACTION', 'Action must be one of: pause, resume, cancel.');
  }

  if (action === 'cancel' && !reason) {
    throw new HttpError(400, 'REASON_REQUIRED', 'Reason is required for mandate cancellation.');
  }

  const mandate = await prisma.mandate.findFirst({ where: { id: mandateId } });
  if (!mandate) throw new HttpError(404, 'MANDATE_NOT_FOUND', `Mandate ${mandateId} not found.`);

  if (!VALID_MANDATE_STATUSES.has(mandate.status)) {
    throw new HttpError(400, 'INVALID_MANDATE_STATUS', `Mandate has unrecognized status: ${mandate.status}`);
  }

  if (!transition.from.has(mandate.status)) {
    throw new HttpError(400, 'INVALID_TRANSITION', `Cannot ${action} a mandate with status '${mandate.status}'.`);
  }

  const now = new Date();
  const before = { ...mandate };

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.mandate.update({
      where: { id: mandateId },
      data: {
        status: transition.to as any,
        updatedAt: now,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        id: randomUUID(),
        adminId: actor?.userId || null,
        action: `mandate.${action}`,
        entityType: 'mandate',
        entityId: mandate.id,
        beforeJson: before as any,
        afterJson: updated as any,
        reason: reason || `Admin ${action}d mandate.`,
        ipAddress: requestContext.ipAddress || null,
        userAgent: requestContext.userAgent || null,
      },
    });

    return updated;
  });

  return result;
}

export const updateMandateStatus = withReceipt(_updateMandateStatus, 'mandate_updated', {
  entityType: 'mandate',
  entityId: (result: any) => result.id,
  afterState: (result: any) => result.status,
  subjectUserId: (result: any) => result.userId,
  source: 'derived',
});

import type { RequestContext } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';
import { withReceipt } from '#shared/services/withReceipt.js';

export async function getMandate(config: AppConfig, actor: Actor, mandateId: string) {
  const mandate = await prisma.mandate.findFirst({ where: { id: mandateId } });
  if (!mandate) throw new HttpError(404, 'MANDATE_NOT_FOUND', 'Mandate not found.');
  if (mandate.userId !== actor?.userId) throw new HttpError(403, 'FORBIDDEN', 'Mandate does not belong to you.');
  return mandate;
}

async function _authorizeMandate(config: AppConfig, actor: Actor, mandateId: string) {
  const mandate = await prisma.mandate.findFirst({ where: { id: mandateId } });
  if (!mandate) throw new HttpError(404, 'MANDATE_NOT_FOUND', 'Mandate not found.');

  if (mandate.userId !== actor?.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Mandate does not belong to you.');
  }

  const owner = await prisma.user.findFirst({ where: { id: mandate.userId } });
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

  const now = new Date();
  const before = { ...mandate };

  const updated = await prisma.mandate.update({
    where: { id: mandateId },
    data: {
      status: 'active',
      updatedAt: now,
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'mandate.authorize',
      entityType: 'mandate',
      entityId: mandate.id,
      beforeJson: before as any,
      afterJson: updated as any,
      reason: 'Client authorized mandate.',
      ipAddress: null,
      userAgent: null,
      createdAt: now,
    },
  });

  return updated;
}

export const authorizeMandate = withReceipt(_authorizeMandate, 'mandate_authorized', {
  entityType: 'mandate',
  entityId: (result: any) => result.id,
  afterState: (result: any) => result.status,
  source: 'mock',
});

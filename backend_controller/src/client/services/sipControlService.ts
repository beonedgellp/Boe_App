import type { AppConfig, Actor } from '#types/index.js';
import type { SipAction } from '#types/services.js';
import type { SipControlRequestRow } from '#types/models.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';
import { withReceipt } from '#shared/services/withReceipt.js';

const VALID_ACTIONS = ['pause', 'resume', 'cancel', 'skip', 'step_up', 'change_amount'];

const STATUS_MAP: Record<string, string> = {
  pause: 'pause_requested',
  resume: 'active',
  cancel: 'cancel_requested',
  skip: 'skip_requested',
  step_up: 'step_up_scheduled',
  change_amount: 'change_requested',
};

async function _requestSipControl(config: AppConfig, actor: Actor, planId: string, action: string, reason: string, confirmed: boolean) {
  if (!VALID_ACTIONS.includes(action)) {
    throw new HttpError(400, 'INVALID_ACTION', `Action must be one of: ${VALID_ACTIONS.join(', ')}.`);
  }

  if (['cancel', 'change_amount'].includes(action) && confirmed !== true) {
    throw new HttpError(400, 'CONFIRMATION_REQUIRED', 'Cancel and amount change require explicit confirmation');
  }

  if (!planId) {
    throw new HttpError(400, 'PLAN_ID_REQUIRED', 'Plan ID is required.');
  }

  const plan = await prisma.investmentPlan.findFirst({ where: { id: planId } });
  if (!plan) {
    throw new HttpError(404, 'PLAN_NOT_FOUND', 'Investment plan not found.');
  }
  if (plan.userId !== actor?.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Plan does not belong to you.');
  }

  const now = new Date();
  const newStatus = STATUS_MAP[action] as any;
  const beforePlan = { ...plan };

  const result = await prisma.$transaction(async (tx) => {
    await tx.investmentPlan.update({
      where: { id: planId },
      data: {
        status: newStatus,
        updatedAt: now,
      },
    });

    const request = await tx.sipControlRequest.create({
      data: {
        userId: actor.userId,
        planId,
        action,
        reason: reason || '',
        status: 'pending',
        confirmed: false,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: actor.userId || null,
        action: `sip.${action}`,
        entityType: 'investment_plan',
        entityId: planId,
        beforeJson: beforePlan as any,
        afterJson: { ...beforePlan, status: newStatus, updatedAt: now.toISOString() } as any,
        reason: reason || `SIP ${action} requested by client.`,
        ipAddress: null,
        userAgent: null,
      },
    });

    return request;
  });

  return {
    id: result.id,
    userId: result.userId,
    planId: result.planId,
    action: result.action,
    reason: result.reason,
    status: result.status,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  };
}

export async function listSipControlRequests(config: AppConfig, actor: Actor) {
  const items = await prisma.sipControlRequest.findMany({
    where: { userId: actor?.userId },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = items.map((item) => ({
    id: item.id,
    userId: item.userId,
    planId: item.planId,
    action: item.action,
    reason: item.reason,
    status: item.status,
    confirmed: item.confirmed,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));

  return { items: mapped, count: mapped.length, page: 1, pageSize: mapped.length, total: mapped.length, source: 'prisma' };
}

export const requestSipControl = withReceipt(_requestSipControl, 'sip_control_requested', {
  entityType: 'sip_control_request',
  entityId: (result: Record<string, unknown>) => result.id,
  afterState: (result: Record<string, unknown>) => result.status,
  source: 'derived',
});

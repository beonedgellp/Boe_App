import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { readJsonStore, updateJsonStore } from '#db/pgAdapter.js';
import { withReceipt } from '#shared/services/withReceipt.js';

const VALID_ACTIONS = ['pause', 'resume', 'cancel', 'skip', 'step_up', 'change_amount'];

const STATUS_MAP = {
  pause: 'pause_requested',
  resume: 'active',
  cancel: 'cancel_requested',
  skip: 'skip_requested',
  step_up: 'step_up_scheduled',
  change_amount: 'change_requested',
};

async function _requestSipControl(config, actor, planId, action, reason, confirmed) {
  if (!VALID_ACTIONS.includes(action)) {
    throw new HttpError(400, 'INVALID_ACTION', `Action must be one of: ${VALID_ACTIONS.join(', ')}.`);
  }

  if (['cancel', 'change_amount'].includes(action) && confirmed !== true) {
    throw new HttpError(400, 'CONFIRMATION_REQUIRED', 'Cancel and amount change require explicit confirmation');
  }

  if (!planId) {
    throw new HttpError(400, 'PLAN_ID_REQUIRED', 'Plan ID is required.');
  }

  const result = await updateJsonStore(config, (store) => {
    const order = (store.investmentPlans || store.orders || []).find((o) => o.id === planId);
    if (!order) return null;
    if (order.userId !== actor?.userId) {
      throw new HttpError(403, 'FORBIDDEN', 'Plan does not belong to you.');
    }

    const now = new Date().toISOString();
    const beforeOrder = { ...order };

    order.status = STATUS_MAP[action];
    order.updatedAt = now;

    const request = {
      id: randomUUID(),
      userId: actor?.userId,
      planId,
      action,
      reason: reason || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    store.sipControlRequests.push(request);

    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: `sip.${action}`,
      entityType: 'investment_plan',
      entityId: planId,
      before: beforeOrder,
      after: { ...order },
      reason: reason || `SIP ${action} requested by client.`,
      ipAddress: null,
      userAgent: null,
      createdAt: now,
    });

    return request;
  });

  if (!result) throw new HttpError(404, 'PLAN_NOT_FOUND', 'Investment plan not found.');
  return result;
}

export async function listSipControlRequests(config, actor) {
  const store = await readJsonStore(config);
  const items = (store.sipControlRequests || [])
    .filter((r) => r.userId === actor?.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { items, count: items.length, page: 1, pageSize: items.length, total: items.length, source: 'json' };
}

export const requestSipControl = withReceipt(_requestSipControl, 'sip_control_requested', {
  entityType: 'sip_control_request',
  entityId: (result) => result.id,
  afterState: (result) => result.status,
  source: 'derived',
});

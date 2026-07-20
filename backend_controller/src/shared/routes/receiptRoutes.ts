import { Routes } from './constants.js';
import { getReceipts, getReceipt } from '../services/receiptService.js';
import { HttpError } from '#http/errors.js';

const CLIENT_ROLES = ['client', 'admin'];
const ADMIN_ROLES = ['admin'];

export function registerClientReceiptRoutes(router) {
  router.get(Routes.GET_V1_CLIENT_RECEIPTS, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'List receipts for the current user.',
  }, async ({ config, actor, query }) => {
    const filters = {
      subjectUserId: actor.userId,
      entityType: query?.entityType || undefined,
      entityId: query?.entityId || undefined,
      kind: query?.kind || undefined,
    };
    const receipts = await getReceipts(config, filters);
    return { items: receipts, count: receipts.length };
  });

  router.get(Routes.GET_V1_CLIENT_RECEIPTS_RECEIPTID, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Get a single receipt by ID.',
  }, async ({ config, actor, params }) => {
    const receipt = await getReceipt(config, params.receiptId);
    if (!receipt) {
      throw new HttpError(404, 'RECEIPT_NOT_FOUND', 'Receipt not found.');
    }
    if (receipt.subjectUserId !== actor.userId) {
      throw new HttpError(403, 'FORBIDDEN', 'Receipt does not belong to you.');
    }
    return receipt;
  });
}

export function registerAdminReceiptRoutes(router) {
  router.get(Routes.GET_V1_ADMIN_RECEIPTS, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Admin receipt search with filters.',
  }, async ({ config, query }) => {
    const filters = {
      subjectUserId: query?.subjectUserId || undefined,
      entityType: query?.entityType || undefined,
      entityId: query?.entityId || undefined,
      kind: query?.kind || undefined,
    };
    const receipts = await getReceipts(config, filters);
    return { items: receipts, count: receipts.length };
  });
}

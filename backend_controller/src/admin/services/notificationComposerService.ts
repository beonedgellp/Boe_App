import type { NotificationBody } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { readJsonStore, updateJsonStore } from '#db/pgAdapter.js';

export async function sendNotification(config: AppConfig, actor: Actor, body: NotificationBody) {
  const title = String(body?.title || '').trim();
  const messageBody = String(body?.body || '').trim();
  const target = String(body?.target || '').trim().toLowerCase();

  if (!title) throw new HttpError(400, 'TITLE_REQUIRED', 'Notification title is required.');
  if (!messageBody) throw new HttpError(400, 'BODY_REQUIRED', 'Notification body is required.');
  if (!['user', 'all', 'cohort'].includes(target)) {
    throw new HttpError(400, 'INVALID_TARGET', 'Target must be "user", "all", or "cohort".');
  }

  const store = await readJsonStore(config);
  const now = new Date().toISOString();
  let targetUserIds = [];

  if (target === 'user') {
    const userId = String(body?.userId || '').trim();
    if (!userId) throw new HttpError(400, 'USER_ID_REQUIRED', 'userId is required when target is "user".');
    const user = store.users.find((u) => u.id === userId);
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'Target user not found.');
    targetUserIds = [userId];
  } else if (target === 'all') {
    targetUserIds = store.users.filter((u) => u.role === 'client').map((u) => u.id);
  } else {
    // cohort: approved users only
    targetUserIds = store.users
      .filter((u) => u.role === 'client' && u.status === 'approved')
      .map((u) => u.id);
  }

  const notificationIds: any[] = [];
  await updateJsonStore(config, (s) => {
    if (!Array.isArray(s.notifications)) s.notifications = [];
    for (const userId of targetUserIds) {
      const n = {
        id: randomUUID(),
        userId,
        type: 'admin',
        title,
        body: messageBody,
        readAt: null,
        createdAt: now,
      };
      s.notifications.push(n);
      notificationIds.push(n.id);
    }
    return { sentCount: targetUserIds.length, notificationIds };
  });

  return { sentCount: targetUserIds.length, notificationIds };
}

export async function notifyUserApproved(config: AppConfig, userId: string, userName: any) {
  const now = new Date().toISOString();
  let notificationId;
  await updateJsonStore(config, (s) => {
    if (!Array.isArray(s.notifications)) s.notifications = [];
    const n = {
      id: randomUUID(),
      userId,
      type: 'approval',
      title: 'Account Approved',
      body: `Welcome aboard, ${userName || 'there'}! Your account has been approved. You can now start investing.`,
      readAt: null,
      createdAt: now,
    };
    s.notifications.push(n);
    notificationId = n.id;
    return n;
  });
  return { notificationId };
}

export async function notifyUserRejected(config: AppConfig, userId: string, userName: any, reason: any) {
  const now = new Date().toISOString();
  let notificationId;
  await updateJsonStore(config, (s) => {
    if (!Array.isArray(s.notifications)) s.notifications = [];
    const n = {
      id: randomUUID(),
      userId,
      type: 'rejection',
      title: 'Account Application Update',
      body: `Hi ${userName || 'there'}, your account application could not be approved at this time. Reason: ${reason || 'Not specified'}`,
      readAt: null,
      createdAt: now,
    };
    s.notifications.push(n);
    notificationId = n.id;
    return n;
  });
  return { notificationId };
}

export async function listAdminNotifications(config: AppConfig, { page = 1, limit = 25 }: { page?: number; limit?: number } = {}) {
  const store = await readJsonStore(config);
  let items = Array.isArray(store.notifications) ? store.notifications : [];
  items = items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const maxLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const currentPage = Math.max(1, Number(page) || 1);
  const start = (currentPage - 1) * maxLimit;
  const paginated = items.slice(start, start + maxLimit);

  return {
    items: paginated,
    count: paginated.length,
    total: items.length,
    page: currentPage,
    limit: maxLimit,
  };
}

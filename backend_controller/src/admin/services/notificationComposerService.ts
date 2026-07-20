import type { NotificationBody } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';

export async function sendNotification(config: AppConfig, actor: Actor, body: NotificationBody) {
  const title = String(body?.title || '').trim();
  const messageBody = String(body?.body || '').trim();
  const target = String(body?.target || '').trim().toLowerCase();

  if (!title) throw new HttpError(400, 'TITLE_REQUIRED', 'Notification title is required.');
  if (!messageBody) throw new HttpError(400, 'BODY_REQUIRED', 'Notification body is required.');
  if (!['user', 'all', 'cohort'].includes(target)) {
    throw new HttpError(400, 'INVALID_TARGET', 'Target must be "user", "all", or "cohort".');
  }

  let targetUserIds: string[] = [];

  if (target === 'user') {
    const userId = String(body?.userId || '').trim();
    if (!userId) throw new HttpError(400, 'USER_ID_REQUIRED', 'userId is required when target is "user".');
    const user = await prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'Target user not found.');
    targetUserIds = [userId];
  } else if (target === 'all') {
    const users = await prisma.user.findMany({ where: { role: 'client' }, select: { id: true } });
    targetUserIds = users.map((u) => u.id);
  } else {
    // cohort: approved users only
    const users = await prisma.user.findMany({
      where: { role: 'client', status: 'approved' },
      select: { id: true },
    });
    targetUserIds = users.map((u) => u.id);
  }

  const notificationIds: string[] = [];
  const now = new Date();

  for (const userId of targetUserIds) {
    const id = randomUUID();
    await prisma.notification.create({
      data: {
        id,
        userId,
        kind: 'admin',
        title,
        body: messageBody,
        status: 'unread',
        createdAt: now,
      },
    });
    notificationIds.push(id);
  }

  return { sentCount: targetUserIds.length, notificationIds };
}

export async function notifyUserApproved(config: AppConfig, userId: string, userName: any) {
  const id = randomUUID();
  await prisma.notification.create({
    data: {
      id,
      userId,
      kind: 'approval',
      title: 'Account Approved',
      body: `Welcome aboard, ${userName || 'there'}! Your account has been approved. You can now start investing.`,
      status: 'unread',
    },
  });
  return { notificationId: id };
}

export async function notifyUserRejected(config: AppConfig, userId: string, userName: any, reason: any) {
  const id = randomUUID();
  await prisma.notification.create({
    data: {
      id,
      userId,
      kind: 'rejection',
      title: 'Account Application Update',
      body: `Hi ${userName || 'there'}, your account application could not be approved at this time. Reason: ${reason || 'Not specified'}`,
      status: 'unread',
    },
  });
  return { notificationId: id };
}

export async function listAdminNotifications(config: AppConfig, { page = 1, limit = 25 }: { page?: number; limit?: number } = {}) {
  const maxLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const currentPage = Math.max(1, Number(page) || 1);
  const skip = (currentPage - 1) * maxLimit;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: maxLimit,
    }),
    prisma.notification.count(),
  ]);

  return {
    items,
    count: items.length,
    total,
    page: currentPage,
    limit: maxLimit,
  };
}

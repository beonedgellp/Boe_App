import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';

export async function markNotificationRead(config: AppConfig, actor: Actor, notificationId: any) {
  const notification = await prisma.notification.findFirst({ where: { id: notificationId } });

  if (!notification) throw new HttpError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');

  if (notification.userId !== actor?.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Notification does not belong to you.');
  }

  const now = new Date();
  const updated = await prisma.notification.updateMany({
    where: { userId: actor.userId, id: notificationId },
    data: { status: 'read', readAt: now },
  });

  return { ...notification, status: 'read', readAt: now.toISOString() };
}

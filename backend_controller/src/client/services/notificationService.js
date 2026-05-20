import { HttpError } from '../../http/errors.js';
import { jsonStoreEnabled, updateJsonStore } from '../../db/jsonStore.js';

export async function markNotificationRead(config, actor, notificationId) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for notifications is not yet implemented.');
  }

  const updated = await updateJsonStore(config, (store) => {
    const notifications = store.notifications || [];
    const idx = notifications.findIndex((n) => n.id === notificationId);
    if (idx === -1) return null;

    const notification = notifications[idx];
    if (notification.userId !== actor?.userId) {
      throw new HttpError(403, 'FORBIDDEN', 'Notification does not belong to you.');
    }

    const now = new Date().toISOString();
    notification.readAt = now;
    notification.updatedAt = now;
    return notification;
  });

  if (!updated) throw new HttpError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
  return updated;
}

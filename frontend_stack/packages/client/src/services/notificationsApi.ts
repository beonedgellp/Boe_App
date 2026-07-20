import { fixtureNotifications } from '../data/fixtureNotifications.ts';
import { apiRequest, clone, delay, listFromPayload, useHttpApi } from './_util.ts';

let items = clone(fixtureNotifications);

export async function listNotifications() {
  if (useHttpApi()) return listFromPayload(await apiRequest('/v1/client/notifications'));

  await delay();
  return clone(items);
}

export async function markRead(id) {
  if (useHttpApi()) {
    await apiRequest(`/v1/client/notifications/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { read: true },
    });
    return;
  }

  await delay(60);
  items = items.map((n) => (n.id === id ? { ...n, read: true } : n));
}

export async function markAllRead() {
  if (useHttpApi()) {
    const notifications = await listNotifications();
    await Promise.all(notifications.filter((n) => !n.read).map((n) => markRead(n.id)));
    return;
  }

  await delay(80);
  items = items.map((n) => ({ ...n, read: true }));
}

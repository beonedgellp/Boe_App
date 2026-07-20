import { apiRequest, useHttpApi } from '@beonedge/client/services/_util.ts';
import { listPendingApprovals } from '@beonedge/client/services/authApi.ts';
import { collectionKey, normalizeAdminCollection } from './formatters.ts';

export async function loadAdminOverview() {
  if (!useHttpApi()) {
    const approvals = await listPendingApprovals();
    return {
      source: 'fixture',
      counts: { approvals: approvals.length },
      stats: { pendingApprovals: approvals.length },
    };
  }
  return apiRequest('/v1/admin/overview', { scope: 'admin' });
}

function extractAdminCollection(payload, path) {
  const key = collectionKey(path);
  const data = payload?.data ?? payload ?? [];
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data[key])) return data[key];
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

export async function loadAdminCollection(path) {
  if (!useHttpApi()) {
    return path.endsWith('/approvals') ? listPendingApprovals() : [];
  }
  const payload = await apiRequest(path, { scope: 'admin' });
  return normalizeAdminCollection(extractAdminCollection(payload, path), path);
}

export function fmtInt(value) {
  return Number.isFinite(Number(value)) ? String(Number(value)) : '0';
}

export function initials(name, fallback = 'AD') {
  if (!name) return fallback;
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function displayRole(user) {
  const role = String(user?.role || user?.accountType || user?.roles?.[0] || 'admin').trim();
  return role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'Admin';
}

export function collectionKey(path) {
  return String(path || '').split('/').filter(Boolean).pop();
}

export function normalizeApprovalRow(row: any = {}) {
  return {
    id: row.id || row.userId || '',
    userId: row.userId || row.id || '',
    name: row.name || row.fullName || 'Unknown',
    email: row.email || '',
    phone: row.phone || '',
    status: row.status || 'pending',
    kycStatus: row.kycStatus || 'pending',
    riskProfileStatus: row.riskProfileStatus || 'pending',
    createdAt: row.createdAt || row.registeredAt || '',
    updatedAt: row.updatedAt || '',
  };
}

export function normalizeAdminCollection(rows, path) {
  return collectionKey(path) === 'approvals' ? rows.map(normalizeApprovalRow) : rows;
}

export function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function csvNumbers(value) {
  if (!value) return [];
  return String(value).split(',').map((s) => Number(s.trim())).filter(Number.isFinite);
}



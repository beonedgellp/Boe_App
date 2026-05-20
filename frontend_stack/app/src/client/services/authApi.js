import { fixtureUser } from '../data/fixtureUser.js';
import {
  apiRequest,
  clearSessionTokens,
  clone,
  delay,
  setSessionTokens,
  storedRefreshToken,
  storedUser,
  useHttpApi,
} from './_util.js';

let _users = {
  client: null,
  admin: null,
};

const LOCAL_PENDING_APPROVALS_KEY = 'boe.local.pendingApprovals';

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  const last = digits.slice(-3);
  return last ? `+91 ••••• ••${last}` : '';
}

function localUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function browserStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readLocalPendingApprovals() {
  const raw = browserStorage()?.getItem(LOCAL_PENDING_APPROVALS_KEY);
  if (!raw) return [];
  try {
    const rows = JSON.parse(raw);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeLocalPendingApprovals(rows) {
  const storage = browserStorage();
  if (!storage) return;
  storage.setItem(LOCAL_PENDING_APPROVALS_KEY, JSON.stringify(rows));
}

function rememberLocalPendingApproval(user) {
  const row = {
    id: user.id || user.approvalRef || localUuid(),
    name: user.name,
    email: user.email,
    status: user.status,
    role: user.role || 'client',
    createdAt: new Date().toISOString(),
    approvalRef: user.approvalRef || '',
  };
  const rows = readLocalPendingApprovals().filter((item) => item.email !== row.email);
  rows.unshift(row);
  writeLocalPendingApprovals(rows);
}

function toClientUser(user) {
  if (!user) return null;
  const name = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'BeOnEdge Client';
  const rawRoles = Array.isArray(user.roles) ? user.roles : [];
  const role = String(user.role || user.accountType || rawRoles[0] || 'client').toLowerCase();
  const roles = (rawRoles.length ? rawRoles : [role])
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return {
    id: user.id,
    name,
    email: user.email || '',
    phoneMasked: user.phoneMasked || maskPhone(user.phone),
    status: user.status || 'approved',
    approvalRef: user.approvalRef || user.approval_ref || user.approvalReference || user.approval_reference || '',
    riskProfileStatus: user.riskProfileStatus || user.risk_profile_status || '',
    kycStatus: user.kycStatus || user.kyc_status || '',
    role,
    roles,
    avatarInitials: user.avatarInitials || initials(name) || 'BO',
  };
}

function hasRole(user, role) {
  return user?.roles?.some((value) => String(value).toLowerCase() === role) ||
    String(user?.role || '').toLowerCase() === role;
}

function assertScopeUser(user, scope) {
  if (scope === 'admin' && !hasRole(user, 'admin')) {
    const error = new Error('Admin access is required.');
    error.code = 'ADMIN_REQUIRED';
    throw error;
  }
  if (scope === 'client' && hasRole(user, 'admin')) {
    const error = new Error('Use the admin login for admin access.');
    error.code = 'ADMIN_LOGIN_REQUIRED';
    throw error;
  }
  return user;
}

export async function login(credentials = {}, { scope = 'client' } = {}) {
  if (useHttpApi()) {
    const result = await apiRequest('/v1/auth/login', {
      method: 'POST',
      auth: false,
      body: credentials,
    });
    const user = assertScopeUser(toClientUser(result.user), scope);
    setSessionTokens({ user, accessToken: result.accessToken, refreshToken: result.refreshToken, scope });
    _users[scope] = user;
    return clone(user);
  }

  await delay(280);
  const identifier = String(credentials.identifier || credentials.email || credentials.phone || '').trim();
  const isEmail = identifier.includes('@');
  const isAdmin = scope === 'admin';
  const user = assertScopeUser(toClientUser({
    ...fixtureUser,
    id: `local_${Date.now()}`,
    name: isAdmin ? 'BeOnEdge Admin' : isEmail ? identifier.split('@')[0] : 'BeOnEdge Client',
    email: isEmail ? identifier : fixtureUser.email,
    phone: isEmail ? '' : identifier,
    status: 'approved',
    role: isAdmin ? 'admin' : 'client',
    roles: [isAdmin ? 'admin' : 'client'],
  }), scope);
  _users[scope] = user;
  return clone(user);
}

export async function listPendingApprovals() {
  await delay(80);
  return clone(readLocalPendingApprovals());
}

export async function signup(details = {}, { scope = 'client' } = {}) {
  if (useHttpApi()) {
    const result = await apiRequest('/v1/auth/signup', {
      method: 'POST',
      auth: false,
      body: details,
    });
    const user = assertScopeUser(toClientUser(result.user), scope);
    setSessionTokens({ user, accessToken: result.accessToken, refreshToken: result.refreshToken, scope });
    _users[scope] = user;
    return clone(user);
  }

  await delay(280);
  const user = assertScopeUser(toClientUser({
    id: `local_${Date.now()}`,
    name: details.name || details.email || 'BeOnEdge Client',
    email: details.email || '',
    phone: details.phone || '',
    role: 'client',
    status: 'pending_review',
    approvalRef: localUuid(),
    riskProfileStatus: 'pending',
    kycStatus: 'pending',
  }), scope);
  _users[scope] = user;
  rememberLocalPendingApproval(user);
  return clone(user);
}

export async function logout({ scope = 'client' } = {}) {
  if (useHttpApi()) {
    try {
      await apiRequest('/v1/auth/logout', { method: 'POST', scope });
    } finally {
      clearSessionTokens(scope);
      _users[scope] = null;
    }
    return;
  }

  await delay(120);
  _users[scope] = null;
}

async function refreshCurrentUser(scope) {
  const refreshToken = storedRefreshToken(scope);
  if (!refreshToken) {
    throw new Error('No refresh token available.');
  }
  const result = await apiRequest('/v1/auth/refresh', {
    method: 'POST',
    auth: false,
    scope,
    body: { refreshToken },
  });
  const user = assertScopeUser(toClientUser(result.user), scope);
  setSessionTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken, user, scope });
  _users[scope] = user;
  return clone(user);
}

export async function currentUser({ scope = 'client' } = {}) {
  if (useHttpApi()) {
    let current;
    try {
      current = await apiRequest('/v1/auth/session', { scope });
    } catch {
      const refreshed = await refreshCurrentUser(scope).catch(() => null);
      if (refreshed) return refreshed;
      clearSessionTokens(scope);
      _users[scope] = null;
      return null;
    }

    if (!current.authenticated) {
      const refreshed = await refreshCurrentUser(scope).catch(() => null);
      if (refreshed) return refreshed;
      clearSessionTokens(scope);
      _users[scope] = null;
      return null;
    }

    let user;
    try {
      user = assertScopeUser(toClientUser({ ...storedUser(scope), ...current.user }), scope);
    } catch {
      clearSessionTokens(scope);
      _users[scope] = null;
      return null;
    }
    _users[scope] = user;
    return clone(user);
  }

  await delay(60);
  return _users[scope] ? clone(_users[scope]) : null;
}

export async function checkReachability() {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('simulate') === 'offline') {
    await delay(180);
    return { ok: false, minVersion: '1.0.0' };
  }

  if (useHttpApi()) {
    return apiRequest('/v1/system/reachability', { auth: false });
  }

  await delay(180);
  return { ok: true, minVersion: '1.0.0' };
}

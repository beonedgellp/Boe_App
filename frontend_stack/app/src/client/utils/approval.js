export const APPROVED_STATUS = 'approved';
export const PENDING_APPROVAL_STATUSES = new Set(['draft', 'pending_review', 'kyc_pending']);
export const TERMINAL_ACCOUNT_STATUSES = new Set(['rejected', 'suspended', 'closed']);

export function normalizedStatus(user) {
  return String(user?.status || '').trim().toLowerCase();
}

export function isApprovedUser(user) {
  return normalizedStatus(user) === APPROVED_STATUS;
}

export function isPendingApprovalUser(user) {
  return PENDING_APPROVAL_STATUSES.has(normalizedStatus(user));
}

export function isTerminalAccount(user) {
  return TERMINAL_ACCOUNT_STATUSES.has(normalizedStatus(user));
}

export function isExecutionRoute(route = '') {
  const value = String(route || '');
  return (
    value.startsWith('/app/invest/') ||
    value.includes('/authorize') ||
    value.startsWith('/app/payment/')
  );
}

export function approvalRef(user) {
  return user?.approvalRef || user?.approval_ref || '';
}

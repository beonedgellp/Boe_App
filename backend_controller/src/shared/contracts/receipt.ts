/**
 * Receipt schema — canonical event-receipt abstraction for all state-mutating operations.
 */

export const ReceiptKind = Object.freeze({
  SIP_CREATED: 'sip_created',
  LUMPSUM_CREATED: 'lumpsum_created',
  INSTALLMENT_PAID: 'installment_paid',
  MANDATE_AUTHORIZED: 'mandate_authorized',
  PAYMENT_RETRIED: 'payment_retried',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_RECONCILED: 'payment_reconciled',
  SIP_CONTROL_REQUESTED: 'sip_control_requested',
  WITHDRAWAL_SUBMITTED: 'withdrawal_submitted',
  KYC_UPDATED: 'kyc_updated',
  KYC_APPROVED: 'kyc_approved',
  KYC_REJECTED: 'kyc_rejected',
  DISCLOSURE_PUBLISHED: 'disclosure_published',
  REDEMPTION_PROCESSED: 'redemption_processed',
  MANDATE_UPDATED: 'mandate_updated',
});

const ALL_KINDS: string[] = Object.values(ReceiptKind);
const VALID_SOURCES = new Set(['mock', 'live', 'derived']);
const VALID_CURRENCIES = new Set(['INR']);
const VALID_ENTITY_TYPES = new Set([
  'investment_plan',
  'mandate',
  'payment',
  'sip_control_request',
  'redemption',
  'kyc_profile',
]);

export function isValidReceiptKind(value) {
  return typeof value === 'string' && ALL_KINDS.includes(value);
}

export function validateReceipt(receipt) {
  const errors = [];

  if (!receipt.id || typeof receipt.id !== 'string') {
    errors.push('id is required and must be a string');
  }
  if (!isValidReceiptKind(receipt.kind)) {
    errors.push('kind is required and must be a valid ReceiptKind');
  }
  if (!receipt.actor || typeof receipt.actor !== 'object') {
    errors.push('actor is required and must be an object');
  } else {
    if (!receipt.actor.userId || typeof receipt.actor.userId !== 'string') {
      errors.push('actor.userId is required and must be a string');
    }
    if (!receipt.actor.role || typeof receipt.actor.role !== 'string') {
      errors.push('actor.role is required and must be a string');
    }
  }
  if (!receipt.subjectUserId || typeof receipt.subjectUserId !== 'string') {
    errors.push('subjectUserId is required and must be a string');
  }
  if (!VALID_ENTITY_TYPES.has(receipt.entityType)) {
    errors.push('entityType is required and must be a valid entity type');
  }
  if (!receipt.entityId || typeof receipt.entityId !== 'string') {
    errors.push('entityId is required and must be a string');
  }
  if (receipt.beforeState !== null && typeof receipt.beforeState !== 'string') {
    errors.push('beforeState must be a string or null');
  }
  if (!receipt.afterState || typeof receipt.afterState !== 'string') {
    errors.push('afterState is required and must be a string');
  }
  if (receipt.amount !== null && (typeof receipt.amount !== 'number' || !Number.isFinite(receipt.amount))) {
    errors.push('amount must be a finite number or null');
  }
  if (receipt.currency !== null && !VALID_CURRENCIES.has(receipt.currency)) {
    errors.push('currency must be "INR" or null');
  }
  if (!receipt.asOfTimestamp || typeof receipt.asOfTimestamp !== 'string') {
    errors.push('asOfTimestamp is required and must be an ISO string');
  }
  if (!VALID_SOURCES.has(receipt.source)) {
    errors.push('source is required and must be one of: mock, live, derived');
  }
  if (receipt.consentOrDisclosureSnapshotRef !== null && typeof receipt.consentOrDisclosureSnapshotRef !== 'string') {
    errors.push('consentOrDisclosureSnapshotRef must be a string or null');
  }
  if (receipt.taxRegimeVersion !== null && typeof receipt.taxRegimeVersion !== 'string') {
    errors.push('taxRegimeVersion must be a string or null');
  }
  if (!receipt.createdAt || typeof receipt.createdAt !== 'string') {
    errors.push('createdAt is required and must be an ISO string');
  }

  return errors;
}

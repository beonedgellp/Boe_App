// Domain interfaces for service-layer parameters.
// These replace the `any` annotations with real, meaningful types.

// ────────────────────────────────────────────────────────────────
// Common patterns
// ────────────────────────────────────────────────────────────────

/** Metadata attached to audit-logged mutations (IP, user-agent from request). */
export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | string[] | null;
  headers?: Record<string, string | string[] | undefined>;
  idempotencyKey?: string;
}

/** Pagination parameters common to list endpoints. */
export interface PaginationParams {
  page?: number;
  limit?: number;
  pageSize?: number;
}

// ────────────────────────────────────────────────────────────────
// SIP Control
// ────────────────────────────────────────────────────────────────

export type SipAction = 'pause' | 'resume' | 'cancel' | 'skip' | 'step_up' | 'change_amount';

// ────────────────────────────────────────────────────────────────
// Orders & SIPs
// ────────────────────────────────────────────────────────────────

export interface OrderBody {
  fundId?: string;
  productId?: string;
  amount?: number | string;
  mode?: string;
  provider?: string;
  paymentMethod?: string;
  notes?: string;
  consentTextVersion?: string;
  consentedAt?: string;
}

export interface SipBody extends OrderBody {
  durationMonths?: number;
  startDate?: string;
  frequency?: string;
  debitDay?: number;
}

// ────────────────────────────────────────────────────────────────
// Payments
// ────────────────────────────────────────────────────────────────

export interface PaymentReconcileBody {
  reason?: string;
  provider?: string;
  providerReference?: string;
  providerRef?: string;
  settlementReference?: string;
  status?: string;
}

export interface RetryPaymentOptions {
  provider?: string;
  paymentMethod?: string;
}

// ────────────────────────────────────────────────────────────────
// Admin — Users
// ────────────────────────────────────────────────────────────────

export interface UpdateUserStatusBody {
  status?: string;
  reason?: string;
}

// ────────────────────────────────────────────────────────────────
// Admin — Funds
// ────────────────────────────────────────────────────────────────

export interface FundBody {
  name?: string;
  tagline?: string;
  status?: string;
  lifecycleStage?: string;
  totalPoolSize?: number | string;
  initialInvestment?: number | string;
  currentValue?: number | string;
  launchDate?: string;
  minSip?: number | string;
  minLumpsum?: number | string;
  minDurationMonths?: number | string;
  lockInText?: string;
  riskLabel?: string;
  sectors?: unknown[];
  category?: string;
  subCategory?: string;
  riskText?: string;
  holdingsAsOf?: string;
  nav?: number | string;
  rating?: number | string;
  performanceSummary?: Record<string, unknown>;
  performanceSeries?: unknown[];
  performancePeriods?: unknown[];
  assetAllocation?: unknown[];
  advancedRatios?: Record<string, unknown>;
  chartConfig?: Record<string, unknown>;
  displayFields?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FundAllocationBody {
  amount?: number | string;
  fundId?: string;
  holdingId?: string;
  type?: string;
  reason?: string;
  requiresDualApproval?: boolean;
  dualApprovalThresholdConfigVersion?: string | null;
  approvals?: unknown[];
}

export interface RedemptionProcessBody {
  action?: 'approve' | 'reject';
  reason?: string;
  paidAmount?: number | string;
  payoutDate?: string;
}

// ────────────────────────────────────────────────────────────────
// Admin — Payments filters
// ────────────────────────────────────────────────────────────────

export interface AdminPaymentFilters extends PaginationParams {
  fundId?: string;
  status?: string;
  userId?: string;
  provider?: string;
  from?: string;
  to?: string;
  q?: string;
}

export interface AdminUserFilters extends PaginationParams {
  status?: string;
  q?: string;
}

export interface AdminTransactionFilters extends PaginationParams {
  fundId?: string;
  status?: string;
  type?: string;
  userId?: string;
  q?: string;
}

// ────────────────────────────────────────────────────────────────
// Admin — Mandates / KYC / Notifications
// ────────────────────────────────────────────────────────────────

export type MandateAdminAction = 'pause' | 'resume' | 'cancel';

export interface MandateAdminBody {
  action?: string;
  reason?: string;
}

export interface KycReviewBody {
  action?: 'approve' | 'reject';
  reason?: string;
}

export interface NotificationBody {
  title?: string;
  body?: string;
  type?: string;
  target?: string;
  userId?: string;
  targetUserIds?: string[];
  metadata?: Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────
// Webhooks
// ────────────────────────────────────────────────────────────────

export interface WebhookPayload {
  eventId?: string;
  id?: string;
  providerRef?: string;
  status?: string;
  event?: string;
  failureReason?: string | null;
  timestamp?: string | number;
  created_at?: string | number;
  payload?: Record<string, any>;
  [key: string]: unknown;
}

// ────────────────────────────────────────────────────────────────
// Auth
// ────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  identifier?: string;
  email?: string;
  phone?: string;
  password?: string;
  username?: string;
}

export interface SignupDetails {
  email?: string;
  phone?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}

export interface DeviceSessionOptions {
  headers?: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────
// Timeline / Receipts
// ────────────────────────────────────────────────────────────────

export interface TimelineEventInput {
  entity: any;
  kind: string;
  category: string;
  actor: { userId: string | null; role: string | null; name?: string | null };
  entityType: string;
  description: string;
  source: string;
  timestamp?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────
// App Config / Landing
// ────────────────────────────────────────────────────────────────

export interface PublishConfigOptions {
  reason?: string;
  defaultReason?: string;
  auditAction?: string;
  entityType?: string;
  requestContext?: RequestContext;
}

// ────────────────────────────────────────────────────────────────
// withReceipt callback signatures
// ────────────────────────────────────────────────────────────────

export type ReceiptEntityIdFn = (result: Record<string, unknown>) => string;
export type ReceiptStateFn = (result: Record<string, unknown>) => unknown;
export type ReceiptKindFn = (result: Record<string, unknown>, args: unknown[]) => string;

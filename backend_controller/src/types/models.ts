// Database row interfaces — derived from SQL migrations.
// All IDs are uuid strings, timestamps are ISO strings, numeric columns are number, jsonb is Record<string,any> or specific shapes.

export interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  username: string | null;
  passwordHash: string | null;
  role: 'client' | 'admin' | 'operations' | 'support' | 'system';
  status: 'draft' | 'pending_review' | 'kyc_pending' | 'approved' | 'rejected' | 'suspended' | 'closed';
  riskProfileStatus: string;
  kycStatus: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  suspendedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceSessionRow {
  id: string;
  userId: string;
  deviceId: string;
  refreshTokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  pushToken: string | null;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRow {
  id: string;
  userId: string;
  transactionId: string | null;
  provider: string;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  mode: string | null;
  status: 'created' | 'gateway_initiated' | 'pending' | 'success' | 'failed' | 'expired' | 'refunded' | 'reconciled';
  failureReason: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  confirmedAt: string | null;
  reconciledAt: string | null;
  updatedAt: string;
  // Dynamic fields from JSON payload
  [key: string]: any;
}

export interface InvestmentPlanRow {
  id: string;
  userId: string;
  productId: string;
  type: 'sip' | 'one_time';
  amount: number;
  durationMonths: number | null;
  debitDay: number | null;
  status: string;
  mandateId: string | null;
  startDate: string | null;
  nextDueDate: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface TransactionRow {
  id: string;
  userId: string;
  productId: string;
  investmentPlanId: string | null;
  type: 'sip_installment' | 'one_time_investment' | 'redemption' | 'fee' | 'adjustment' | 'refund';
  amount: number;
  nav: number | null;
  units: number | null;
  status: string;
  idempotencyKey: string | null;
  requestedAt: string;
  paymentConfirmedAt: string | null;
  allottedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface MandateRow {
  id: string;
  userId: string;
  investmentPlanId: string | null;
  provider: string;
  providerMandateId: string | null;
  maxAmount: number;
  frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  debitDay: number | null;
  status: string;
  idempotencyKey: string | null;
  validFrom: string | null;
  validTo: string | null;
  lastDebitAt: string | null;
  nextDebitAt: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface FundRow {
  id: string;
  name: string;
  description: string | null;
  lifecycleStage: string;
  currency: string;
  minSip: number | null;
  minLumpsum: number | null;
  aumCash: number;
  aumAllocated: number;
  metadata: Record<string, any>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Extra fields from JSON payload storage
  [key: string]: any;
}

export interface SipControlRequestRow {
  id: string;
  userId: string;
  planId: string | null;
  action: string;
  reason: string | null;
  status: string;
  confirmed: boolean;
  reviewedAdminId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface RedemptionRequestRow {
  id: string;
  userId: string;
  fundId: string | null;
  previewId: string | null;
  amount: number;
  status: string;
  requiresDualApproval: boolean;
  dualApprovalThresholdConfigVersion: string | null;
  approvals: any[];
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface NotificationRow {
  id: string;
  userId: string;
  kind: string;
  title: string | null;
  body: string | null;
  status: string;
  readAt: string | null;
  createdAt: string;
  [key: string]: any;
}

export interface SupportTicketRow {
  id: string;
  userId: string;
  subject: string;
  category: string | null;
  status: string;
  priority: string | null;
  assignedAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface SupportTicketMessageRow {
  id: string;
  ticketId: string;
  authorId: string | null;
  authorRole: string;
  body: string;
  attachments: any[];
  createdAt: string;
}

export interface AdminAuditLogRow {
  id: string;
  adminId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeJson: Record<string, any> | null;
  afterJson: Record<string, any> | null;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface OrderRow {
  id: string;
  userId: string;
  productId: string | null;
  investmentPlanId: string | null;
  type: string;
  amount: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface FaqRow {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StatementRow {
  id: string;
  userId: string;
  period: string;
  fromDate: string;
  toDate: string;
  generatedAt: string | null;
  documentUrl: string | null;
  status: 'queued' | 'generated' | 'failed' | 'voided';
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KycProfileRow {
  id: string;
  userId: string;
  panNumberEncrypted: string | null;
  panLast4: string | null;
  aadhaarLast4: string | null;
  addressJson: Record<string, any>;
  documentRefsJson: any[];
  reviewStatus: string;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppConfigVersionRow {
  id: string;
  configKey: string;
  version: number;
  configJson: Record<string, any>;
  status: 'published' | 'archived';
  publishedBy: string | null;
  publishedAt: string;
  createdAt: string;
}

export interface CapitalTransactionRow {
  id: string;
  fundId: string;
  type: string;
  amount: number;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  reason: string | null;
  actorAdminId: string | null;
  createdAt: string;
  [key: string]: any;
}

// PortfolioSnapshot (dynamic)
export interface PortfolioSnapshotRow {
  id: string;
  userId: string;
  asOfDate: string;
  totalValue: number | null;
  investedValue: number | null;
  createdAt: string;
  [key: string]: any;
}

// Holding within a portfolio (from JSON payload)
export interface HoldingItem {
  id?: string;
  fundId?: string;
  name?: string;
  units?: number;
  currentNav?: number;
  avgCost?: number;
  investedAmount?: number;
  currentValue?: number;
  [key: string]: any;
}

// Course (007)
export interface CourseRow {
  id: string;
  slug: string;
  name: string;
  level: string;
  format: string;
  outcome: string;
  description: string | null;
  pricePaise: number | null;
  status: 'draft' | 'published' | 'archived';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Plan (007)
export interface PlanRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  pricePaise: number;
  cadence: 'one_time' | 'monthly' | 'yearly';
  features: any[];
  ctaLabel: string;
  featured: boolean;
  status: 'draft' | 'published' | 'archived';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

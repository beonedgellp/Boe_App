import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'dev-db.json');
const now = new Date();
const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const isoNow = now.toISOString();
const isoFuture = futureDate.toISOString();
const isoPast = pastDate.toISOString();

function loadDb() {
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

function saveDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + '\n', 'utf8');
}

function uuid() {
  return crypto.randomUUID();
}

// --- Idempotent checkers ---
function userExists(db, email) {
  return db.users.some(u => u.email === email);
}

function fundExists(db, name) {
  return db.funds.some(f => f.name === name);
}

function planExists(db, userId, type, status) {
  return db.investmentPlans.some(p => p.userId === userId && p.type === type && p.status === status);
}

function kycProfileExists(db, userId) {
  return db.kycProfiles.some(k => k.userId === userId);
}

function ticketExists(db, title) {
  return db.supportTickets.some(t => t.title === title);
}

function notificationExists(db, userId, title) {
  return db.notifications.some(n => n.userId === userId && n.title === title);
}

function timelineEventExists(db, userId, type) {
  return db.timelineEvents.some(e => e.userId === userId && e.type === type);
}

function sipControlRequestExists(db, planId, action) {
  return db.sipControlRequests.some(r => r.planId === planId && r.action === action);
}

function redemptionRequestExists(db, userId, amount, status) {
  return db.redemptionRequests.some(r => r.userId === userId && r.amount === amount && r.status === status);
}

function webhookExists(db, collection, idempotencyKey) {
  return db[collection].some(w => w.idempotencyKey === idempotencyKey);
}

// Approved user IDs from existing data
const approvedUsers = [
  '020ab38e-2c59-4311-85de-c642c2fa4a74',
  '360ff427-a18a-4f96-932c-ff1f54b8d73e',
  'ba21a4f3-48cf-4bc4-9866-bcebe8b62cf9'
];

const existingFundId = '4f5cea02-d834-4e6b-b672-2195a88be346';

const db = loadDb();
const stats = { added: {} };

// Ensure all arrays exist
const arrays = [
  'users', 'deviceSessions', 'funds', 'investmentPlans', 'transactions',
  'payments', 'mandates', 'sipControlRequests', 'supportTickets',
  'redemptionRequests', 'notifications', 'timelineEvents',
  'paymentWebhookEvents', 'mandateWebhookEvents', 'kycProfiles'
];
arrays.forEach(key => {
  if (!Array.isArray(db[key])) db[key] = [];
});

// Reuse existing password hash for consistency
const knownPasswordHash = 'scrypt$16384$8$1$UO1aTi7EWNeH5ev5Io52Pg$1Pop-nd_5VBDBcRJdb_l9mFtioN5WafmNw6OdX-lgayxn5EGbeOtuZ3wm_CJYRpl9AEJZwfznUHWgUpSpkeOrA';

// 1. Admin user
if (!userExists(db, 'admin@beonedge.local')) {
  const adminId = uuid();
  const adminUser = {
    id: adminId,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@beonedge.local',
    phone: '+919999999999',
    passwordHash: knownPasswordHash,
    role: 'admin',
    status: 'active',
    approvalRef: null,
    riskProfileStatus: 'approved',
    kycStatus: 'approved',
    approvedAt: isoNow,
    createdAt: isoNow,
    updatedAt: isoNow
  };
  db.users.push(adminUser);

  const adminSession = {
    id: uuid(),
    userId: adminId,
    deviceId: uuid(),
    refreshTokenHash: 'a'.repeat(64),
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    ipAddress: '127.0.0.1',
    lastSeenAt: isoNow,
    expiresAt: isoFuture,
    revokedAt: null,
    createdAt: isoNow,
    updatedAt: isoNow
  };
  db.deviceSessions.push(adminSession);
  stats.added.adminUser = 1;
  stats.added.adminDeviceSession = 1;
}

// 2. Pending KYC user
if (!userExists(db, 'pending.kyc@beonedge.local')) {
  const pendingId = uuid();
  const pendingUser = {
    id: pendingId,
    firstName: 'Pending',
    lastName: 'KYC',
    email: 'pending.kyc@beonedge.local',
    phone: '+918888888888',
    passwordHash: knownPasswordHash,
    role: 'client',
    status: 'pending_approval',
    approvalRef: uuid(),
    riskProfileStatus: 'pending',
    kycStatus: 'pending',
    approvedAt: null,
    createdAt: isoNow,
    updatedAt: isoNow
  };
  db.users.push(pendingUser);

  if (!kycProfileExists(db, pendingId)) {
    db.kycProfiles.push({
      id: uuid(),
      userId: pendingId,
      panNumberEncrypted: null,
      panLast4: null,
      aadhaarLast4: null,
      addressJson: {},
      documentRefsJson: [],
      fatcaStatus: 'not_started',
      fatcaDeclaration: null,
      nominees: [],
      reKycDueDate: null,
      reKycTriggerReason: null,
      reviewStatus: 'pending_review',
      adminNotes: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: isoNow,
      updatedAt: isoNow
    });
    stats.added.pendingKycUser = 1;
    stats.added.pendingKycProfile = 1;
  }
}

// 3. Rejected KYC user
if (!userExists(db, 'rejected.kyc@beonedge.local')) {
  const rejectedId = uuid();
  const rejectedUser = {
    id: rejectedId,
    firstName: 'Rejected',
    lastName: 'KYC',
    email: 'rejected.kyc@beonedge.local',
    phone: '+917777777777',
    passwordHash: knownPasswordHash,
    role: 'client',
    status: 'rejected',
    approvalRef: null,
    riskProfileStatus: 'rejected',
    kycStatus: 'rejected',
    approvedAt: null,
    createdAt: isoNow,
    updatedAt: isoNow
  };
  db.users.push(rejectedUser);

  if (!kycProfileExists(db, rejectedId)) {
    db.kycProfiles.push({
      id: uuid(),
      userId: rejectedId,
      panNumberEncrypted: null,
      panLast4: null,
      aadhaarLast4: null,
      addressJson: {},
      documentRefsJson: [],
      fatcaStatus: 'not_started',
      fatcaDeclaration: null,
      nominees: [],
      reKycDueDate: null,
      reKycTriggerReason: null,
      reviewStatus: 'rejected',
      adminNotes: 'Documents unclear',
      reviewedBy: '00000000-0000-4000-8000-000000000001',
      reviewedAt: isoPast,
      createdAt: isoNow,
      updatedAt: isoNow
    });
    stats.added.rejectedKycUser = 1;
    stats.added.rejectedKycProfile = 1;
  }
}

// 4. Funds
const seedFunds = [
  {
    name: 'BeOnEdge Income Fund',
    status: 'draft',
    lifecycleStage: 'draft',
    tagline: 'Regular income through high-quality debt instruments.',
    totalPoolSize: 15000000,
    initialInvestment: 0,
    currentValue: 0,
    launchDate: '',
    cagr: {},
    nav: 0,
    navAsOf: '',
    navHistory: [],
    minSip: 500,
    minLumpsum: 5000,
    minDurationMonths: 0,
    lockInText: '',
    riskLabel: 'low',
    maxDrawdownPct: 0,
    sharpe: 0,
    sectors: [],
    investments: [],
    chartConfig: {
      showSectorDistribution: true,
      showInvestmentBreakdown: false,
      showCompanyNames: false,
      showNavHistory: true,
      showCagr: true
    }
  },
  {
    name: 'BeOnEdge Balanced Fund',
    status: 'coming_soon',
    lifecycleStage: 'published',
    tagline: 'Balanced growth with moderate risk through equity-debt mix.',
    totalPoolSize: 25000000,
    initialInvestment: 0,
    currentValue: 0,
    launchDate: '2026-07-01',
    cagr: { '1y': 12.5, '3y': 15.2, '5y': 14.1 },
    nav: 112.45,
    navAsOf: isoNow,
    navHistory: [
      { x: 0, y: 100 },
      { x: 1, y: 102 },
      { x: 2, y: 104 },
      { x: 3, y: 103.5 },
      { x: 4, y: 106 },
      { x: 5, y: 108 },
      { x: 6, y: 109.5 },
      { x: 7, y: 110 },
      { x: 8, y: 111 },
      { x: 9, y: 112 },
      { x: 10, y: 112.3 },
      { x: 11, y: 112.45 }
    ],
    minSip: 500,
    minLumpsum: 5000,
    minDurationMonths: 12,
    lockInText: 'None',
    riskLabel: 'moderate',
    maxDrawdownPct: 8.5,
    sharpe: 1.15,
    sectors: [
      { id: 'sec_b1', name: 'Equity', percentage: 60, color: '#4F46E5' },
      { id: 'sec_b2', name: 'Debt', percentage: 35, color: '#10B981' },
      { id: 'sec_b3', name: 'Gold', percentage: 5, color: '#F59E0B' }
    ],
    investments: [
      { id: 'inv_b1', companyName: 'HDFC Bank', amount: 3000000, sectorId: 'sec_b1' },
      { id: 'inv_b2', companyName: 'Infosys Ltd', amount: 2500000, sectorId: 'sec_b1' },
      { id: 'inv_b3', companyName: 'GOI 7.4% 2034', amount: 4000000, sectorId: 'sec_b2' },
      { id: 'inv_b4', companyName: 'SBI Fixed Deposit', amount: 3000000, sectorId: 'sec_b2' },
      { id: 'inv_b5', companyName: 'Sovereign Gold Bonds', amount: 1250000, sectorId: 'sec_b3' }
    ],
    chartConfig: {
      showSectorDistribution: true,
      showInvestmentBreakdown: true,
      showCompanyNames: true,
      showNavHistory: true,
      showCagr: true
    }
  },
  {
    name: 'BeOnEdge Legacy Fund',
    status: 'archived',
    lifecycleStage: 'archived',
    tagline: 'Previously active fund, now archived for reference.',
    totalPoolSize: 10000000,
    initialInvestment: 0,
    currentValue: 0,
    launchDate: '2020-01-01',
    cagr: { '1y': 6.5, '3y': 8.2, '5y': 9.1, '10y': 10.5 },
    nav: 145.2,
    navAsOf: isoPast,
    navHistory: [
      { x: 0, y: 100 },
      { x: 1, y: 105 },
      { x: 2, y: 110 },
      { x: 3, y: 115 },
      { x: 4, y: 120 },
      { x: 5, y: 125 },
      { x: 6, y: 130 },
      { x: 7, y: 135 },
      { x: 8, y: 138 },
      { x: 9, y: 140 },
      { x: 10, y: 142 },
      { x: 11, y: 145.2 }
    ],
    minSip: 500,
    minLumpsum: 5000,
    minDurationMonths: 12,
    lockInText: 'None',
    riskLabel: 'moderate',
    maxDrawdownPct: 10.2,
    sharpe: 1.05,
    sectors: [
      { id: 'sec_l1', name: 'Large Cap', percentage: 50, color: '#4F46E5' },
      { id: 'sec_l2', name: 'Mid Cap', percentage: 30, color: '#10B981' },
      { id: 'sec_l3', name: 'Debt', percentage: 20, color: '#F59E0B' }
    ],
    investments: [
      { id: 'inv_l1', companyName: 'Reliance Industries', amount: 2000000, sectorId: 'sec_l1' },
      { id: 'inv_l2', companyName: 'TCS Ltd', amount: 1500000, sectorId: 'sec_l1' },
      { id: 'inv_l3', companyName: 'Bharat Forge', amount: 1000000, sectorId: 'sec_l2' },
      { id: 'inv_l4', companyName: 'GOI Bonds', amount: 2000000, sectorId: 'sec_l3' }
    ],
    chartConfig: {
      showSectorDistribution: true,
      showInvestmentBreakdown: true,
      showCompanyNames: true,
      showNavHistory: true,
      showCagr: true
    }
  }
];

seedFunds.forEach(fundTemplate => {
  if (!fundExists(db, fundTemplate.name)) {
    const fund = { ...fundTemplate, id: uuid(), createdAt: isoNow, updatedAt: isoNow };
    db.funds.push(fund);
    stats.added.funds = (stats.added.funds || 0) + 1;
  }
});

// 5. Active SIP
const activeSipUser = approvedUsers[1]; // Priya Sharma
if (!planExists(db, activeSipUser, 'sip', 'active')) {
  const planId = uuid();
  const txId = uuid();
  const payId = uuid();
  const mndId = uuid();

  db.investmentPlans.push({
    id: planId,
    userId: activeSipUser,
    productId: existingFundId,
    type: 'sip',
    amount: 5000,
    durationMonths: 36,
    debitDay: 10,
    status: 'active',
    transactionId: txId,
    paymentId: payId,
    mandateId: mndId,
    startDate: isoPast,
    nextDueDate: isoFuture,
    completedAt: null,
    cancelledAt: null,
    createdAt: isoPast,
    updatedAt: isoNow
  });

  db.transactions.push({
    id: txId,
    userId: activeSipUser,
    productId: existingFundId,
    investmentPlanId: planId,
    type: 'sip_installment',
    amount: 5000,
    nav: 142.35,
    units: 35.12,
    status: 'success',
    idempotencyKey: uuid(),
    requestedAt: isoPast,
    paymentConfirmedAt: isoPast,
    allottedAt: isoPast,
    cancelledAt: null,
    createdAt: isoPast,
    updatedAt: isoNow
  });

  db.payments.push({
    id: payId,
    userId: activeSipUser,
    transactionId: txId,
    provider: 'razorpay',
    providerPaymentId: 'pay_seed_' + Math.random().toString(36).slice(2, 10),
    amount: 5000,
    currency: 'INR',
    mode: 'upi_autopay',
    status: 'confirmed',
    failureReason: null,
    idempotencyKey: uuid(),
    createdAt: isoPast,
    confirmedAt: isoPast,
    reconciledAt: isoPast,
    updatedAt: isoNow,
    attemptCount: 1,
    lastFailureReason: null
  });

  db.mandates.push({
    id: mndId,
    userId: activeSipUser,
    investmentPlanId: planId,
    provider: 'razorpay',
    providerMandateId: 'mdt_seed_' + Math.random().toString(36).slice(2, 10),
    maxAmount: 5000,
    frequency: 'monthly',
    debitDay: 10,
    status: 'active',
    idempotencyKey: uuid(),
    validFrom: isoPast.split('T')[0],
    validTo: '2030-12-31',
    lastDebitAt: isoPast,
    nextDebitAt: isoFuture,
    createdAt: isoPast,
    updatedAt: isoNow
  });

  stats.added.activeSip = 1;
}

// 6. Paused SIP
const pausedSipUser = approvedUsers[2]; // RKBS Client
if (!planExists(db, pausedSipUser, 'sip', 'paused')) {
  const planId = uuid();
  const txId = uuid();
  const payId = uuid();
  const mndId = uuid();

  db.investmentPlans.push({
    id: planId,
    userId: pausedSipUser,
    productId: existingFundId,
    type: 'sip',
    amount: 3000,
    durationMonths: 24,
    debitDay: 5,
    status: 'paused',
    transactionId: txId,
    paymentId: payId,
    mandateId: mndId,
    startDate: isoPast,
    nextDueDate: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: isoPast,
    updatedAt: isoNow,
    pausedAt: isoPast
  });

  db.transactions.push({
    id: txId,
    userId: pausedSipUser,
    productId: existingFundId,
    investmentPlanId: planId,
    type: 'sip_installment',
    amount: 3000,
    nav: 142.35,
    units: 21.07,
    status: 'success',
    idempotencyKey: uuid(),
    requestedAt: isoPast,
    paymentConfirmedAt: isoPast,
    allottedAt: isoPast,
    cancelledAt: null,
    createdAt: isoPast,
    updatedAt: isoNow
  });

  db.payments.push({
    id: payId,
    userId: pausedSipUser,
    transactionId: txId,
    provider: 'razorpay',
    providerPaymentId: 'pay_seed_' + Math.random().toString(36).slice(2, 10),
    amount: 3000,
    currency: 'INR',
    mode: 'upi_autopay',
    status: 'confirmed',
    failureReason: null,
    idempotencyKey: uuid(),
    createdAt: isoPast,
    confirmedAt: isoPast,
    reconciledAt: isoPast,
    updatedAt: isoNow,
    attemptCount: 1,
    lastFailureReason: null
  });

  db.mandates.push({
    id: mndId,
    userId: pausedSipUser,
    investmentPlanId: planId,
    provider: 'razorpay',
    providerMandateId: 'mdt_seed_' + Math.random().toString(36).slice(2, 10),
    maxAmount: 3000,
    frequency: 'monthly',
    debitDay: 5,
    status: 'paused',
    idempotencyKey: uuid(),
    validFrom: isoPast.split('T')[0],
    validTo: '2030-12-31',
    lastDebitAt: isoPast,
    nextDebitAt: null,
    createdAt: isoPast,
    updatedAt: isoNow
  });

  stats.added.pausedSip = 1;
}

// 7. One-time lumpsum
const lumpsumUser = approvedUsers[0]; // RKB Client
if (!planExists(db, lumpsumUser, 'one_time', 'completed')) {
  const planId = uuid();
  const txId = uuid();
  const payId = uuid();

  db.investmentPlans.push({
    id: planId,
    userId: lumpsumUser,
    productId: existingFundId,
    type: 'one_time',
    amount: 50000,
    durationMonths: null,
    debitDay: null,
    status: 'completed',
    transactionId: txId,
    paymentId: payId,
    mandateId: null,
    startDate: isoPast,
    nextDueDate: null,
    completedAt: isoPast,
    cancelledAt: null,
    createdAt: isoPast,
    updatedAt: isoNow
  });

  db.transactions.push({
    id: txId,
    userId: lumpsumUser,
    productId: existingFundId,
    investmentPlanId: planId,
    type: 'lumpsum',
    amount: 50000,
    nav: 140.0,
    units: 357.14,
    status: 'success',
    idempotencyKey: uuid(),
    requestedAt: isoPast,
    paymentConfirmedAt: isoPast,
    allottedAt: isoPast,
    cancelledAt: null,
    createdAt: isoPast,
    updatedAt: isoNow
  });

  db.payments.push({
    id: payId,
    userId: lumpsumUser,
    transactionId: txId,
    provider: 'razorpay',
    providerPaymentId: 'pay_seed_' + Math.random().toString(36).slice(2, 10),
    amount: 50000,
    currency: 'INR',
    mode: 'netbanking',
    status: 'confirmed',
    failureReason: null,
    idempotencyKey: uuid(),
    createdAt: isoPast,
    confirmedAt: isoPast,
    reconciledAt: isoPast,
    updatedAt: isoNow,
    attemptCount: 1,
    lastFailureReason: null
  });

  stats.added.lumpsum = 1;
}

// 8. SIP control requests
const activeSipPlan = db.investmentPlans.find(
  p => p.userId === activeSipUser && p.type === 'sip' && p.status === 'active'
);
if (activeSipPlan && !sipControlRequestExists(db, activeSipPlan.id, 'pause')) {
  db.sipControlRequests.push({
    id: uuid(),
    userId: activeSipUser,
    planId: activeSipPlan.id,
    action: 'pause',
    status: 'pending',
    reason: 'Financial constraints',
    newAmount: null,
    createdAt: isoNow,
    updatedAt: isoNow
  });
  stats.added.sipControlRequests = (stats.added.sipControlRequests || 0) + 1;
}

if (activeSipPlan && !sipControlRequestExists(db, activeSipPlan.id, 'change_amount')) {
  db.sipControlRequests.push({
    id: uuid(),
    userId: activeSipUser,
    planId: activeSipPlan.id,
    action: 'change_amount',
    status: 'approved',
    reason: 'Salary increase',
    newAmount: 7500,
    createdAt: isoPast,
    updatedAt: isoNow,
    processedAt: isoNow,
    processedBy: '00000000-0000-4000-8000-000000000001'
  });
  stats.added.sipControlRequests = (stats.added.sipControlRequests || 0) + 1;
}

// 8b. SIP control requests for RKB Client (rahul@mal.com)
const rkbSipUser = approvedUsers[0];
const rkbSipPlan = db.investmentPlans.find(
  p => p.userId === rkbSipUser && p.type === 'sip'
);
if (rkbSipPlan && !sipControlRequestExists(db, rkbSipPlan.id, 'pause')) {
  db.sipControlRequests.push({
    id: uuid(),
    userId: rkbSipUser,
    planId: rkbSipPlan.id,
    action: 'pause',
    status: 'pending',
    reason: 'Temporary financial difficulty',
    newAmount: null,
    createdAt: isoNow,
    updatedAt: isoNow
  });
  stats.added.sipControlRequests = (stats.added.sipControlRequests || 0) + 1;
}

if (rkbSipPlan && !sipControlRequestExists(db, rkbSipPlan.id, 'change_amount')) {
  db.sipControlRequests.push({
    id: uuid(),
    userId: rkbSipUser,
    planId: rkbSipPlan.id,
    action: 'change_amount',
    status: 'approved',
    reason: 'Increase monthly contribution',
    newAmount: 2000,
    createdAt: isoPast,
    updatedAt: isoNow,
    processedAt: isoNow,
    processedBy: '00000000-0000-4000-8000-000000000001'
  });
  stats.added.sipControlRequests = (stats.added.sipControlRequests || 0) + 1;
}

// 9. Redemption requests
if (!redemptionRequestExists(db, lumpsumUser, 25000, 'pending')) {
  const redemptionPlan = db.investmentPlans.find(
    p => p.userId === lumpsumUser && p.type === 'one_time'
  );
  db.redemptionRequests.push({
    id: uuid(),
    userId: lumpsumUser,
    planId: redemptionPlan ? redemptionPlan.id : existingFundId,
    amount: 25000,
    units: 500,
    status: 'pending',
    type: 'partial',
    adminReason: null,
    processedAt: null,
    createdAt: isoNow,
    updatedAt: isoNow
  });
  stats.added.redemptionRequests = (stats.added.redemptionRequests || 0) + 1;
}

if (!redemptionRequestExists(db, pausedSipUser, 50000, 'approved')) {
  const pausedPlan = db.investmentPlans.find(
    p => p.userId === pausedSipUser && p.type === 'sip'
  );
  db.redemptionRequests.push({
    id: uuid(),
    userId: pausedSipUser,
    planId: pausedPlan ? pausedPlan.id : existingFundId,
    amount: 50000,
    units: 1000,
    status: 'approved',
    type: 'partial',
    adminReason: 'Processed via NEFT',
    processedAt: isoPast,
    createdAt: isoPast,
    updatedAt: isoNow
  });
  stats.added.redemptionRequests = (stats.added.redemptionRequests || 0) + 1;
}

// 10. Support tickets
const seedTickets = [
  {
    userId: approvedUsers[0],
    title: 'Unable to complete KYC',
    description: 'The PAN upload fails',
    category: 'kyc',
    priority: 'high',
    status: 'open'
  },
  {
    userId: approvedUsers[1],
    title: 'SIP amount change',
    description: 'Want to increase monthly SIP',
    category: 'sip',
    priority: 'medium',
    status: 'in_progress'
  },
  {
    userId: approvedUsers[2],
    title: 'Question about exit load',
    description: 'What is the exit load for Growth Fund?',
    category: 'general',
    priority: 'low',
    status: 'closed',
    closedAt: isoPast
  }
];

seedTickets.forEach(ticketTemplate => {
  if (!ticketExists(db, ticketTemplate.title)) {
    const ticket = {
      ...ticketTemplate,
      id: uuid(),
      createdAt: isoPast,
      updatedAt: isoNow
    };
    db.supportTickets.push(ticket);
    stats.added.supportTickets = (stats.added.supportTickets || 0) + 1;
  }
});

// 11. Notifications
const seedNotifications = [
  {
    userId: approvedUsers[0],
    title: 'KYC Approved',
    body: 'Your KYC has been approved. You can now start investing.',
    type: 'kyc_approved',
    read: true,
    readAt: isoPast
  },
  {
    userId: approvedUsers[1],
    title: 'SIP Reminder',
    body: 'Your SIP of \u20b95,000 is due on 10th May.',
    type: 'sip_reminder',
    read: false,
    readAt: null
  },
  {
    userId: approvedUsers[2],
    title: 'Market Update',
    body: 'Nifty 50 up by 1.2% today.',
    type: 'market_update',
    read: false,
    readAt: null
  },
  {
    userId: approvedUsers[0],
    title: 'Withdrawal Processed',
    body: 'Your redemption request of \u20b925,000 has been processed.',
    type: 'withdrawal_processed',
    read: true,
    readAt: isoPast
  },
  {
    userId: approvedUsers[1],
    title: 'Welcome to BeOnEdge',
    body: 'Start your investment journey today.',
    type: 'general',
    read: false,
    readAt: null
  }
];

seedNotifications.forEach(notifTemplate => {
  if (!notificationExists(db, notifTemplate.userId, notifTemplate.title)) {
    const notif = {
      ...notifTemplate,
      id: uuid(),
      createdAt: isoPast
    };
    db.notifications.push(notif);
    stats.added.notifications = (stats.added.notifications || 0) + 1;
  }
});

// 12. Timeline events
const timelineTemplates = [
  { userId: approvedUsers[0], type: 'account_created', title: 'Account Created', description: 'Your BeOnEdge account was created.' },
  { userId: approvedUsers[0], type: 'kyc_submitted', title: 'KYC Submitted', description: 'KYC documents uploaded for review.' },
  { userId: approvedUsers[0], type: 'kyc_approved', title: 'KYC Approved', description: 'Your KYC was approved successfully.' },
  { userId: approvedUsers[0], type: 'sip_started', title: 'Lumpsum Invested', description: 'One-time investment of \u20b950,000 initiated.' },
  { userId: approvedUsers[0], type: 'first_payment_confirmed', title: 'Payment Confirmed', description: 'Your payment was confirmed and units allotted.' },

  { userId: approvedUsers[1], type: 'account_created', title: 'Account Created', description: 'Your BeOnEdge account was created.' },
  { userId: approvedUsers[1], type: 'kyc_submitted', title: 'KYC Submitted', description: 'KYC documents uploaded for review.' },
  { userId: approvedUsers[1], type: 'kyc_approved', title: 'KYC Approved', description: 'Your KYC was approved successfully.' },
  { userId: approvedUsers[1], type: 'sip_started', title: 'SIP Started', description: 'Monthly SIP of \u20b95,000 started.' },
  { userId: approvedUsers[1], type: 'mandate_activated', title: 'Mandate Activated', description: 'Auto-debit mandate activated successfully.' },

  { userId: approvedUsers[2], type: 'account_created', title: 'Account Created', description: 'Your BeOnEdge account was created.' },
  { userId: approvedUsers[2], type: 'kyc_submitted', title: 'KYC Submitted', description: 'KYC documents uploaded for review.' },
  { userId: approvedUsers[2], type: 'kyc_approved', title: 'KYC Approved', description: 'Your KYC was approved successfully.' },
  { userId: approvedUsers[2], type: 'sip_started', title: 'SIP Started', description: 'Monthly SIP of \u20b93,000 started.' },
  { userId: approvedUsers[2], type: 'first_payment_confirmed', title: 'Payment Confirmed', description: 'Your first SIP installment was confirmed.' }
];

timelineTemplates.forEach(eventTemplate => {
  if (!timelineEventExists(db, eventTemplate.userId, eventTemplate.type)) {
    const event = {
      ...eventTemplate,
      id: uuid(),
      occurredAt: isoPast,
      metadata: {},
      createdAt: isoPast
    };
    db.timelineEvents.push(event);
    stats.added.timelineEvents = (stats.added.timelineEvents || 0) + 1;
  }
});

// 13. Webhook events
const seedPaymentWebhooks = [
  {
    provider: 'razorpay',
    eventType: 'payment.captured',
    payload: { payment_id: 'pay_seed_001', status: 'captured', amount: 500000 },
    processedAt: isoPast,
    idempotencyKey: 'webhook-payment-success-001'
  },
  {
    provider: 'razorpay',
    eventType: 'payment.failed',
    payload: { payment_id: 'pay_seed_002', status: 'failed', error: 'insufficient_funds' },
    processedAt: isoPast,
    idempotencyKey: 'webhook-payment-fail-001'
  }
];

const seedMandateWebhooks = [
  {
    provider: 'razorpay',
    eventType: 'mandate.authorized',
    payload: { mandate_id: 'mdt_seed_001', status: 'authorized' },
    processedAt: isoPast,
    idempotencyKey: 'webhook-mandate-success-001'
  },
  {
    provider: 'razorpay',
    eventType: 'mandate.failed',
    payload: { mandate_id: 'mdt_seed_002', status: 'failed', error: 'bank_rejection' },
    processedAt: isoPast,
    idempotencyKey: 'webhook-mandate-fail-001'
  }
];

seedPaymentWebhooks.forEach(wh => {
  if (!webhookExists(db, 'paymentWebhookEvents', wh.idempotencyKey)) {
    db.paymentWebhookEvents.push({ ...wh, id: uuid(), createdAt: isoPast });
    stats.added.paymentWebhooks = (stats.added.paymentWebhooks || 0) + 1;
  }
});

seedMandateWebhooks.forEach(wh => {
  if (!webhookExists(db, 'mandateWebhookEvents', wh.idempotencyKey)) {
    db.mandateWebhookEvents.push({ ...wh, id: uuid(), createdAt: isoPast });
    stats.added.mandateWebhooks = (stats.added.mandateWebhooks || 0) + 1;
  }
});

saveDb(db);

console.log('Seed smoke data complete.');
console.log('Summary of additions:');
Object.entries(stats.added).forEach(([key, count]) => {
  console.log(`  ${key}: ${count}`);
});

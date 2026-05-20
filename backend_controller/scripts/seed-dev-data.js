import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const DB_PATH = './data/dev-db.json';

function navHistory(base, points = 30) {
  const history = [];
  let value = base;
  for (let i = 0; i < points; i++) {
    value = value * (1 + (Math.random() * 0.04 - 0.015));
    history.push({ x: i, y: Number(value.toFixed(2)) });
  }
  return history;
}

async function seed() {
  const raw = await readFile(DB_PATH, 'utf8');
  const db = JSON.parse(raw);

  const userId = db.users[0]?.id;
  if (!userId) {
    console.log('No user found to seed data for.');
    process.exit(1);
  }

  const now = new Date().toISOString();

  // Seed app config with products
  const productId = 'beonedge_growth_001';
  const appConfig = {
    id: randomUUID(),
    configKey: 'mobile_app',
    version: 1,
    config: {
      mobile: {
        products: [
          {
            id: productId,
            name: 'BeOnEdge Growth Fund',
            tagline: 'Long-term capital appreciation through diversified equity allocation.',
            objective: 'To generate long-term capital appreciation by investing in a diversified portfolio of equity and equity-related instruments.',
            categoryEyebrow: 'Equity growth',
            status: 'open',
            riskLabel: 'moderate_high',
            nav: 142.35,
            navAsOf: now,
            cagr: { '1y': 18.5, '3y': 22.3, '5y': 19.8, '10y': 16.2 },
            maxDrawdownPct: 12.4,
            sharpe: 1.35,
            minSip: 500,
            minLumpsum: 5000,
            minDurationMonths: 12,
            lockInText: 'None',
            allocation: [
              { label: 'Large cap equity', pct: 45 },
              { label: 'Mid cap equity', pct: 25 },
              { label: 'Small cap equity', pct: 15 },
              { label: 'Debt & equivalents', pct: 15 },
            ],
            topHoldings: [
              { name: 'HDFC Bank Ltd.', pct: 8.2 },
              { name: 'Reliance Industries', pct: 7.5 },
              { name: 'Infosys Ltd.', pct: 6.8 },
              { name: 'ICICI Bank Ltd.', pct: 5.4 },
              { name: 'TCS Ltd.', pct: 4.9 },
            ],
            navHistory: navHistory(120),
            disclosureVersion: 'v1.0',
            methodology: 'Fundamental research-driven stock selection with quarterly rebalancing.',
            fees: [
              { label: 'Expense ratio', value: '1.2% p.a.' },
              { label: 'Exit load', value: '1% if redeemed within 1 year' },
            ],
            horizon: '5 years+',
          },
          {
            id: 'beonedge_static_002',
            name: 'BeOnEdge Static Fund',
            tagline: 'Stable returns through balanced debt-equity allocation.',
            objective: 'To provide stable returns with lower volatility through a balanced mix of debt and equity instruments.',
            categoryEyebrow: 'Balanced',
            status: 'coming_soon',
            riskLabel: 'moderate',
            nav: null,
            navAsOf: '',
            cagr: { '1y': null, '3y': null, '5y': null, '10y': null },
            maxDrawdownPct: null,
            sharpe: null,
            minSip: null,
            minLumpsum: null,
            minDurationMonths: null,
            lockInText: 'None',
            allocation: [],
            topHoldings: [],
            navHistory: [],
            disclosureVersion: 'draft',
            methodology: 'Balanced allocation with dynamic debt-equity rebalancing.',
            fees: [],
            horizon: '3 years+',
          },
        ],
        screens: {
          dashboard: {
            components: [
              { id: 'portfolio_summary', enabled: true },
              { id: 'active_sips', enabled: true },
              { id: 'quick_actions', enabled: true },
              { id: 'research_context', enabled: true },
              { id: 'risk_disclosure', enabled: true },
            ],
            copy: {
              portfolioTitle: 'Current value',
              activeSipsTitle: 'Active SIPs',
              viewAllLabel: 'View all',
              noActiveTitle: 'No active SIPs yet',
              noActiveBody: 'Start your first SIP to build disciplined wealth.',
              noActiveCta: 'Explore products',
              researchTitle: 'Research context',
              riskDisclosure: 'Investments are subject to market risks. Past performance does not guarantee future returns.',
            },
            quickActions: [
              { id: 'start_sip', label: 'Start SIP', icon: 'Plus', route: '/app/explore', enabled: true },
              { id: 'one_time', label: 'One-time', icon: 'Receipt', route: '/app/explore', enabled: true },
              { id: 'history', label: 'History', icon: 'Repeat', route: '/app/transactions', enabled: true },
              { id: 'explore', label: 'Products', icon: 'Compass', route: '/app/explore', enabled: true },
            ],
          },
          explore: {
            components: [
              { id: 'search', enabled: true },
              { id: 'product_catalog', enabled: true },
              { id: 'research_context', enabled: true },
              { id: 'performance_disclosure', enabled: true },
              { id: 'allocation_disclosure', enabled: true },
            ],
            copy: {
              title: 'Explore products',
              productsEyebrow: 'Available products',
              searchPlaceholder: 'Search funds...',
              noMatches: 'No products match your search.',
              researchEyebrow: 'Allocation context',
              performanceDisclosure: 'Past performance is not indicative of future returns.',
              allocationDisclosure: 'Allocations are reviewed quarterly and published after admin approval.',
            },
            charts: { showSparkline: true },
          },
          fundDetail: {
            components: [
              { id: 'objective', enabled: true },
              { id: 'minimums', enabled: true },
              { id: 'performance_chart', enabled: true },
              { id: 'sip_projection', enabled: true },
              { id: 'allocation_chart', enabled: true },
              { id: 'portfolio_exposure', enabled: true },
              { id: 'fees', enabled: true },
              { id: 'methodology_disclosure', enabled: true },
              { id: 'action_bar', enabled: true },
            ],
            copy: {
              objectiveTitle: 'Investment objective',
              minTitle: 'Minimum investment',
              performanceTitle: 'Performance',
              allocationTitle: 'Allocation',
              feesTitle: 'Fees',
              methodologyTitle: 'Methodology',
              investCta: 'Invest now',
              sipCta: 'Start SIP',
            },
            charts: {
              periods: ['1Y', '3Y', '5Y', '10Y'],
              defaultPeriod: '5Y',
            },
          },
          invest: {
            sip: {
              amountPresets: [500, 1000, 2500, 5000, 10000],
              durationMonths: [12, 24, 36, 60, 120],
              debitDays: [1, 5, 10, 15, 20],
              disclosures: {
                consent: 'I authorize BeOnEdge to debit my linked bank account for SIP installments.',
                nav: 'Units will be allotted based on the NAV of the debit date.',
              },
            },
            oneTime: {
              amountPresets: [5000, 10000, 25000, 50000, 100000],
              disclosures: {
                consent: 'I confirm this is a one-time investment via BeOnEdge.',
                nav: 'Units will be allotted based on the NAV of the transaction date.',
              },
            },
          },
        },
        researchContext: [
          { label: 'Equity allocation', value: '85%', note: 'Diversified across large, mid and small cap.' },
          { label: 'Debt allocation', value: '15%', note: 'Short-term debt for stability.' },
          { label: 'Rebalancing frequency', value: 'Quarterly', note: 'Admin-reviewed and published.' },
        ],
      },
    },
    status: 'published',
    publishedAt: now,
    publishedBy: null,
  };

  db.appConfigVersions = [appConfig];

  // Seed portfolio
  const portfolioKey = `portfolio_${userId}`;
  db[portfolioKey] = {
    currentValue: 284700,
    invested: 250000,
    allTimeGain: 34700,
    allTimeGainPct: 13.88,
    todayChange: 1240,
    xirrPct: 16.4,
    asOf: now,
    holdings: [
      {
        fundId: productId,
        fundName: 'BeOnEdge Growth Fund',
        status: 'open',
        units: 2000,
        avgNav: 125.0,
        currentNav: 142.35,
        currentValue: 284700,
        allTimeGain: 34700,
      },
    ],
  };

  // Seed orders
  db.orders = [
    {
      id: 'ord_sip_001',
      userId,
      type: 'sip',
      fundId: productId,
      amount: 25000,
      durationMonths: 60,
      debitDay: 5,
      createdAt: '2025-01-15T10:00:00.000Z',
      status: 'active',
      paymentId: 'pay_001',
      mandateId: 'mnd_001',
      stepUp: null,
      nextDueDate: '2026-05-05',
    },
  ];

  // Seed transactions
  db.transactions = [
    {
      id: 'tx_001',
      userId,
      type: 'sip',
      fundId: productId,
      fundName: 'BeOnEdge Growth Fund',
      amount: 25000,
      units: 198.41,
      nav: 126.0,
      date: '2025-01-15',
      status: 'success',
      mode: 'upi_autopay',
      reference: 'UPI/BEONEDGE/JAN2025',
    },
    {
      id: 'tx_002',
      userId,
      type: 'sip',
      fundId: productId,
      fundName: 'BeOnEdge Growth Fund',
      amount: 25000,
      units: 195.31,
      nav: 128.0,
      date: '2025-02-05',
      status: 'success',
      mode: 'upi_autopay',
      reference: 'UPI/BEONEDGE/FEB2025',
    },
    {
      id: 'tx_003',
      userId,
      type: 'sip',
      fundId: productId,
      fundName: 'BeOnEdge Growth Fund',
      amount: 25000,
      units: 192.31,
      nav: 130.0,
      date: '2025-03-05',
      status: 'success',
      mode: 'upi_autopay',
      reference: 'UPI/BEONEDGE/MAR2025',
    },
    {
      id: 'tx_004',
      userId,
      type: 'sip',
      fundId: productId,
      fundName: 'BeOnEdge Growth Fund',
      amount: 25000,
      units: 189.39,
      nav: 132.0,
      date: '2025-04-05',
      status: 'success',
      mode: 'upi_autopay',
      reference: 'UPI/BEONEDGE/APR2025',
    },
  ];

  // Seed payments
  db.payments = [
    {
      id: 'pay_001',
      userId,
      orderId: 'ord_sip_001',
      amount: 25000,
      status: 'success',
      method: 'upi_autopay',
      provider: 'razorpay',
      createdAt: '2025-01-15T10:00:00.000Z',
      confirmedAt: '2025-01-15T10:02:00.000Z',
    },
  ];

  // Seed mandates
  db.mandates = [
    {
      id: 'mnd_001',
      userId,
      orderId: 'ord_sip_001',
      fundId: productId,
      maxAmount: 25000,
      bank: 'HDFC Bank',
      upiHandle: 'rahul@hdfcbank',
      status: 'active',
      validFrom: '2025-01-15',
      validTo: '2030-01-15',
    },
  ];

  // Seed notifications
  db.notifications = [
    {
      id: 'notif_001',
      userId,
      title: 'SIP debited successfully',
      body: 'Your SIP of ₹25,000 for BeOnEdge Growth Fund has been debited.',
      type: 'payment',
      read: false,
      createdAt: '2025-04-05T10:05:00.000Z',
    },
    {
      id: 'notif_002',
      userId,
      title: 'Portfolio update',
      body: 'Your portfolio is up 1.24% today. View details in the app.',
      type: 'portfolio',
      read: false,
      createdAt: now,
    },
  ];

  await writeFile(DB_PATH, JSON.stringify(db, null, 2) + '\n');
  console.log(`Seeded dev data to ${DB_PATH}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

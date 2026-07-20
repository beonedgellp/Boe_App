// Run: node src/shared/services/fundClientView.test.js
// Mirrors the lightweight node:assert harness used by src/shared/config/taxConfig.test.js.
import { strict as assert } from 'node:assert';
import {
  toClientFund,
  toClientFunds,
  toClientAnalytics,
  normalizePerformanceSeries,
  sanitizeAssetAllocation,
  sanitizeAdvancedRatios,
  sanitizePerformancePeriods,
  sanitizeRating,
} from './fundClientView.js';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

function baseFund(overrides: any = {}) {
  return {
    id: 'fund-1234abcd',
    name: 'BeOnEdge Flexi Pool',
    lifecycleStage: 'active',
    status: 'active',
    totalPoolSize: 1000000,
    initialInvestment: 800000,
    launchDate: '2023-01-01',
    sectors: [
      { id: 'sec_a', name: 'Financials', percentage: 60, color: '#1f7a4d' },
      { id: 'sec_b', name: 'Energy', percentage: 40, color: '#b5894a' },
    ],
    investments: [
      { id: 'inv_aaaa', companyName: 'Acme Bank Ltd', amount: 300000, sectorId: 'sec_a' },
      { id: 'inv_bbbb', companyName: 'Power Grid Ltd', amount: 100000, sectorId: 'sec_b' },
    ],
    chartConfig: {
      showSectorDistribution: true,
      showInvestmentBreakdown: true,
      showCompanyNames: true,
    },
    ...overrides,
  };
}

/* -------------------- lifecycle gating -------------------- */

test('draft funds are not exposed to clients', () => {
  assert.equal(toClientFund(baseFund({ lifecycleStage: 'draft' })), null);
});

test('archived funds are not exposed to clients', () => {
  assert.equal(toClientFund(baseFund({ lifecycleStage: 'archived' })), null);
});

test('active funds are exposed to clients', () => {
  assert.ok(toClientFund(baseFund()));
});

/* -------------------- raw-amount stripping (security) -------------------- */

test('client investments never include raw rupee amount', () => {
  const client = toClientFund(baseFund());
  for (const inv of client.investments) {
    assert.equal(inv.amount, undefined, 'investment.amount must not reach the client');
    assert.ok(typeof inv.percentage === 'number');
  }
});

test('client analytics never include totalInvested or initialInvestment', () => {
  const client = toClientFund(baseFund());
  assert.equal(client.analytics.totalInvested, undefined);
  assert.equal(client.analytics.initialInvestment, undefined);
  // safe metrics still present
  assert.equal(client.analytics.sectorCount, 2);
  assert.ok(client.analytics.fundAge);
});

test('client fund never carries top-level initialInvestment', () => {
  const client = toClientFund(baseFund());
  assert.equal(client.initialInvestment, undefined);
});

test('toClientAnalytics excludes rupee amounts', () => {
  const safe = toClientAnalytics(baseFund());
  assert.equal(safe.totalInvested, undefined);
  assert.equal(safe.initialInvestment, undefined);
});

/* -------------------- company-name masking -------------------- */

test('showCompanyNames=false masks holding names', () => {
  const fund = baseFund({ chartConfig: { showInvestmentBreakdown: true, showCompanyNames: false } });
  const client = toClientFund(fund);
  for (const inv of client.investments) {
    assert.match(inv.companyName, /^Company /);
  }
});

/* -------------------- benchmark gate -------------------- */

const series = [
  { date: '2023-05-20', fund: 100, nifty: 100 },
  { date: '2024-05-20', fund: 118.4, nifty: 111.2 },
];
const periods = [{ key: '3Y', label: '3Y', fundReturnPct: 16.9, niftyReturnPct: 13.4, annualized: true }];
const summary = { selectedPeriod: '3Y', annualizedReturnPct: 16.9, oneDayReturnPct: 0.21, niftyReturnPct: 13.4, asOf: '2026-05-20' };

test('benchmark fields pass through when enabled', () => {
  const client = toClientFund(baseFund({
    performanceSeries: series, performancePeriods: periods, performanceSummary: summary,
    chartConfig: { showBenchmarkComparison: true },
  }));
  assert.equal(client.performanceSeries.length, 2);
  assert.equal(client.performancePeriods.length, 1);
  assert.ok(client.performanceSummary);
});

test('showBenchmarkComparison=false drops series, periods and summary', () => {
  const client = toClientFund(baseFund({
    performanceSeries: series, performancePeriods: periods, performanceSummary: summary,
    chartConfig: { showBenchmarkComparison: false },
  }));
  assert.equal(client.performanceSeries, undefined);
  assert.equal(client.performancePeriods, undefined);
  assert.equal(client.performanceSummary, undefined);
});

test('a single-point series is not exposed (chart would be meaningless)', () => {
  const client = toClientFund(baseFund({
    performanceSeries: [{ date: '2023-05-20', fund: 100, nifty: 100 }],
    chartConfig: { showBenchmarkComparison: true },
  }));
  assert.equal(client.performanceSeries, undefined);
});

/* -------------------- asset allocation gate -------------------- */

const assetAllocation = [
  { id: 'equity', label: 'Equity', percentage: 97.17, color: '#1f7a4d' },
  { id: 'cash', label: 'Cash', percentage: 2.6, color: '#4aa9d8' },
  { id: 'debt', label: 'Debt', percentage: 0.23, color: '#b5894a' },
];

test('asset allocation passes through when enabled', () => {
  const client = toClientFund(baseFund({ assetAllocation, chartConfig: { showAssetAllocation: true } }));
  assert.equal(client.assetAllocation.length, 3);
});

test('showAssetAllocation=false drops asset allocation', () => {
  const client = toClientFund(baseFund({ assetAllocation, chartConfig: { showAssetAllocation: false } }));
  assert.equal(client.assetAllocation, undefined);
});

/* -------------------- advanced ratios gate -------------------- */

const advancedRatios = { pe: 28.36, pb: 3.59, beta: 0.87, alpha: 3.0, sharpe: 0.81, sortino: 1.21 };

test('advanced ratios pass through when enabled', () => {
  const client = toClientFund(baseFund({ advancedRatios, chartConfig: { showAdvancedRatios: true } }));
  assert.equal(client.advancedRatios.pe, 28.36);
});

test('showAdvancedRatios=false drops advanced ratios', () => {
  const client = toClientFund(baseFund({ advancedRatios, chartConfig: { showAdvancedRatios: false } }));
  assert.equal(client.advancedRatios, undefined);
});

/* -------------------- backward compatibility -------------------- */

test('legacy fund without new fields still renders core data', () => {
  const legacy = baseFund();
  delete legacy.performanceSeries;
  delete legacy.assetAllocation;
  delete legacy.advancedRatios;
  const client = toClientFund(legacy);
  assert.equal(client.performanceSeries, undefined);
  assert.equal(client.assetAllocation, undefined);
  assert.equal(client.advancedRatios, undefined);
  assert.equal(client.sectors.length, 2);
  assert.equal(client.allocation.length, 2);
});

test('toClientFunds filters out non-visible funds', () => {
  const list = toClientFunds([baseFund(), baseFund({ lifecycleStage: 'draft' })]);
  assert.equal(list.length, 1);
});

/* -------------------- normalizers / sanitizers -------------------- */

test('normalizePerformanceSeries sorts by date and drops invalid rows', () => {
  const out = normalizePerformanceSeries([
    { date: '2024-05-20', fund: 118.4, nifty: 111.2 },
    { date: 'not-a-date', fund: 5, nifty: 5 },
    { date: '2023-05-20', fund: 100, nifty: 100 },
    { date: '2025-05-20', fund: -3, nifty: 120 }, // non-positive fund value dropped
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].date, '2023-05-20');
  assert.equal(out[1].date, '2024-05-20');
});

test('sanitizeAssetAllocation drops out-of-range and non-finite percentages', () => {
  const out = sanitizeAssetAllocation([
    { id: 'equity', label: 'Equity', percentage: 97.17, color: '#1f7a4d' },
    { id: 'bad', label: 'Bad', percentage: 140, color: '#000' },
    { id: 'nan', label: 'NaN', percentage: 'x', color: '#000' },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'equity');
});

test('sanitizeAdvancedRatios keeps finite numbers and drops blanks/non-finite', () => {
  const out = sanitizeAdvancedRatios({ pe: 28.36, pb: '', beta: 'x', alpha: 3 });
  assert.equal(out.pe, 28.36);
  assert.equal(out.alpha, 3);
  assert.equal('pb' in out, false);
  assert.equal('beta' in out, false);
});

test('sanitizePerformancePeriods keeps known keys and coerces numbers', () => {
  const out = sanitizePerformancePeriods([
    { key: '1M', label: '1M', fundReturnPct: '2.1', niftyReturnPct: 1.3 },
    { key: 'BOGUS', label: 'x', fundReturnPct: 1, niftyReturnPct: 1 },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].fundReturnPct, 2.1);
});

/* -------------------- security hardening (review follow-ups) -------------------- */

test('pre-enriched rupee analytics never survive into the client payload', () => {
  // Simulates enrichFundWithAnalytics having already attached the full object.
  const enriched = baseFund({ analytics: { totalInvested: 13750000, initialInvestment: 800000, sectorCount: 2 } });
  const client = toClientFund(enriched);
  assert.equal(client.analytics.totalInvested, undefined);
  assert.equal(client.analytics.initialInvestment, undefined);
  assert.equal(JSON.stringify(client).includes('13750000'), false);
});

test('sanitizeAssetAllocation rejects unsafe color strings', () => {
  const out = sanitizeAssetAllocation([
    { id: 'a', label: 'A', percentage: 50, color: '#1f7a4d' },
    { id: 'b', label: 'B', percentage: 50, color: 'red; background:url(javascript:alert(1))' },
  ]);
  assert.equal(out[0].color, '#1f7a4d');
  assert.equal(out[1].color, '');
});

test('sanitizeRating clamps value to scale and rejects negatives', () => {
  assert.equal(sanitizeRating({ value: 9, scale: 5 }).value, 5);
  assert.equal(sanitizeRating({ value: -2, scale: 5 }), null);
  assert.equal(sanitizeRating({ value: 4 }).scale, 5);
});

console.log(`\n${passed} checks passed`);

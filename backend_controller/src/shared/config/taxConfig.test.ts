import { TAX_REGIMES, getTaxRegimeForDate } from './taxConfig.js';
import { strict as assert } from 'node:assert';

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
    process.exit(1);
  }
}

test('pre-2024-07-23 date returns stcgRate 0.15', () => {
  const regime = getTaxRegimeForDate(new Date('2024-07-22'));
  assert.equal(regime.stcgRate, 0.15);
});

test('post-2024-07-23 date returns stcgRate 0.20', () => {
  const regime = getTaxRegimeForDate(new Date('2024-07-23'));
  assert.equal(regime.stcgRate, 0.20);
});

test('pre-2024-07-23 ltcgExemptionLimit is 100000', () => {
  const regime = getTaxRegimeForDate(new Date('2024-07-22'));
  assert.equal(regime.ltcgExemptionLimit, 100000);
});

test('post-2024-07-23 ltcgExemptionLimit is 125000', () => {
  const regime = getTaxRegimeForDate(new Date('2024-07-23'));
  assert.equal(regime.ltcgExemptionLimit, 125000);
});

test('default date returns post-2024-07-23 regime', () => {
  const regime = getTaxRegimeForDate();
  assert.equal(regime, TAX_REGIMES.post_2024_07_23);
});

console.log('All taxConfig tests passed.');

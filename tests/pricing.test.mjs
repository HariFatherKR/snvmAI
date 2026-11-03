import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSavings, validCreditAmount } from '../dist/pricing.mjs';

test('20% savings preserve original total and annualize the discount', () => {
  assert.deepEqual(calculateSavings(1_000_000), { original: 1_000_000, discounted: 800_000, saved: 200_000, annual: 2_400_000 });
  for (const amount of [0, 1, 999, 10_000, 100_000_000]) {
    const result = calculateSavings(amount);
    assert.equal(result.discounted + result.saved, amount);
    assert.equal(result.annual, result.saved * 12);
  }
});

test('invalid values cannot enter the monetary calculation', () => {
  for (const amount of [-1, NaN, Infinity, 1.5, '100000', 100_000_001]) {
    assert.throws(() => calculateSavings(amount), RangeError);
  }
});

test('credit preview only accepts whole 1,000 won units in its allowed range', () => {
  for (const amount of [10_000, 50_000, 100_000, 10_000_000]) assert.equal(validCreditAmount(amount), true);
  for (const amount of [0, 9999, 10_001, 10_000_001, NaN, Infinity, '50000']) assert.equal(validCreditAmount(amount), false);
});

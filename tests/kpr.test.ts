import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateKpr,
  monthlyAnnuity,
  validateKpr,
  type KprInput,
} from "../lib/kpr";

const base: KprInput = {
  bank: "btn",
  price: 750_000_000,
  downPaymentPercent: 20,
  years: 15,
  annualRate: 8,
  fixedYears: 3,
  floatingRate: 12,
};
const close = (actual: number, expected: number) =>
  assert.ok(
    Math.abs(actual - expected) < 0.01,
    `${actual} should equal ${expected}`,
  );

test("KPR annuity agrees with independent known repayment and handles zero rate", () => {
  close(monthlyAnnuity(100_000_000, 12, 12), 8_884_878.867834168);
  close(monthlyAnnuity(120_000_000, 0, 120), 1_000_000);
});

test("BTN rate change repays the actual outstanding principal over remaining months", () => {
  const result = calculateKpr(base);
  assert.equal(result.downPayment, 150_000_000);
  assert.equal(result.principal, 600_000_000);
  assert.equal(result.initialMonths, 36);
  assert.equal(result.remainingMonths, 144);
  let balance = result.principal;
  let paid = 0;
  for (let month = 0; month < 180; month++) {
    const initial = month < 36;
    const payment = initial ? result.initialMonthly : result.subsequentMonthly;
    balance = balance * (1 + (initial ? 8 : 12) / 1200) - payment;
    paid += payment;
  }
  close(balance, 0);
  close(paid, result.totalInstallments);
  close(result.totalWithDownPayment, paid + result.downPayment);
  assert.ok(result.subsequentMonthly > result.initialMonthly);
});

test("BSI fixed equivalent-rate illustration has one payment throughout, unaffected by BTN settings", () => {
  const result = calculateKpr({ ...base, bank: "bsi" });
  close(result.initialMonthly, monthlyAnnuity(600_000_000, 8, 180));
  assert.equal(result.initialMonths, 180);
  assert.equal(result.remainingMonths, 0);
  assert.equal(result.initialMonthly, result.subsequentMonthly);
  close(result.financingCost, result.initialMonthly * 180 - 600_000_000);
});

test("all 21 tenors amortize correctly including zero interest and fixed period beyond tenor", () => {
  let previous = Infinity;
  for (let years = 5; years <= 25; years++) {
    const result = calculateKpr({ ...base, years, fixedYears: 25 });
    assert.ok(result.initialMonthly < previous);
    previous = result.initialMonthly;
    assert.equal(result.remainingMonths, 0);
    close(
      calculateKpr({ ...base, years, annualRate: 0, floatingRate: 0 })
        .financingCost,
      0,
    );
  }
  const equalRates = calculateKpr({ ...base, floatingRate: 8 });
  close(equalRates.initialMonthly, equalRates.subsequentMonthly);
});

test("invalid financial inputs never produce a repayment quote", () => {
  for (const invalid of [
    { price: NaN },
    { price: 0 },
    { price: Infinity },
    { downPaymentPercent: -1 },
    { downPaymentPercent: 100 },
    { years: 4 },
    { years: 26 },
    { years: 5.5 },
    { annualRate: -1 },
    { floatingRate: 51 },
    { fixedYears: 0 },
    { fixedYears: 1.5 },
  ]) {
    assert.ok(validateKpr({ ...base, ...invalid }));
    assert.throws(() => calculateKpr({ ...base, ...invalid }), RangeError);
  }
  assert.equal(validateKpr({ ...base, downPaymentPercent: 0 }), null);
});

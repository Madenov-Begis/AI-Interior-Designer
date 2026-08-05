import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCreditMovement,
  balanceAfter,
  canDebit,
  creditTransactionKey,
} from "./policy.ts";

test("never permits a negative projected balance", () => {
  assert.equal(canDebit(4, 4), true);
  assert.equal(canDebit(3, 4), false);
  assert.equal(balanceAfter(4, -4), 0);
  assert.throws(() => balanceAfter(3, -4), /INSUFFICIENT_CREDITS/);
});

test("rejects fractional or non-positive debit amounts", () => {
  assert.throws(() => canDebit(4, 0), /INVALID_CREDIT_AMOUNT/);
  assert.throws(() => canDebit(4, 1.5), /INVALID_CREDIT_AMOUNT/);
  assert.throws(() => balanceAfter(4, -1.5), /INVALID_CREDIT_AMOUNT/);
});

test("builds stable entity-scoped transaction keys", () => {
  assert.equal(
    creditTransactionKey("GENERATION_DEBIT", "generation-id"),
    "GENERATION_DEBIT:generation-id",
  );
});

test("applies one balance movement idempotently", () => {
  const initial = { balance: 10, appliedKeys: new Set<string>() };
  const first = applyCreditMovement(initial, {
    idempotencyKey: "GENERATION_DEBIT:g1",
    amount: -4,
  });
  const duplicate = applyCreditMovement(first, {
    idempotencyKey: "GENERATION_DEBIT:g1",
    amount: -4,
  });
  assert.equal(first.balance, 6);
  assert.equal(duplicate.balance, 6);
  assert.notEqual(first.appliedKeys, initial.appliedKeys);
});

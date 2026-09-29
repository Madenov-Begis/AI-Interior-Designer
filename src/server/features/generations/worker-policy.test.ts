import assert from "node:assert/strict";
import test from "node:test";
import {
  memoryPaused,
  nextAdaptiveLimit,
  providerFailure,
  retryDelay,
} from "./worker-policy.ts";

test("рост требует очередь, успехи и завершение cooldown", () => {
  const state = {
    limit: 10,
    maximum: 20,
    successes: 3,
    lastIncreaseAt: 0,
    cooldownUntil: 0,
    now: 10_000,
    backlog: true,
  };
  assert.equal(nextAdaptiveLimit(state), 11);
  assert.equal(nextAdaptiveLimit({ ...state, backlog: false }), 10);
  assert.equal(nextAdaptiveLimit({ ...state, successes: 0 }), 10);
  assert.equal(nextAdaptiveLimit({ ...state, cooldownUntil: 30_000 }), 10);
  assert.equal(nextAdaptiveLimit({ ...state, limit: 20 }), 20);
});
test("повторяем только явный 429, учитываем Retry-After", () => {
  assert.deepEqual(providerFailure({ status: 429, retryAfter: "5" }), {
    throttled: true,
    retryAfterMs: 5000,
  });
  assert.equal(providerFailure({ status: 503 }).throttled, false);
  assert.equal(providerFailure(new Error("timeout 429")).throttled, false);
  assert.equal(retryDelay(2, 5000, 0), 5000);
});
test("память использует гистерезис, а не колебания у одной границы", () => {
  assert.equal(memoryPaused(false, 74, 100), false);
  assert.equal(memoryPaused(false, 75, 100), true);
  assert.equal(memoryPaused(true, 65, 100), true);
  assert.equal(memoryPaused(true, 59, 100), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { resolveEffectivePlan } from "./resolve-plan.ts";

test("uses the active subscription without loading the default plan", async () => {
  let fallbackCalls = 0;
  const subscriptionPlan = { id: "vip", name: "VIP" };

  const plan = await resolveEffectivePlan(
    subscriptionPlan,
    { id: "free", name: "Free" },
    async () => {
      fallbackCalls += 1;
      return { id: "fallback", name: "Fallback" };
    },
  );

  assert.equal(plan, subscriptionPlan);
  assert.equal(fallbackCalls, 0);
});

test("loads the default plan only when the profile has no plan", async () => {
  let fallbackCalls = 0;

  const plan = await resolveEffectivePlan(
    undefined,
    null,
    async () => {
      fallbackCalls += 1;
      return { id: "free", name: "Free" };
    },
  );

  assert.deepEqual(plan, { id: "free", name: "Free" });
  assert.equal(fallbackCalls, 1);
});

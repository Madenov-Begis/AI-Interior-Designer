import { describe, expect, it, vi } from "vitest";
import { resolveCreditAdjustmentAttempt } from "./credit-adjustment-attempt";

describe("resolveCreditAdjustmentAttempt", () => {
  it("reuses the UUID only when retrying the same normalized operation", () => {
    const createId = vi.fn(() => "attempt-1");
    const first = resolveCreditAdjustmentAttempt(
      null,
      { amount: 25, reason: "  Компенсация  " },
      createId,
    );
    const retry = resolveCreditAdjustmentAttempt(
      first.attempt,
      { amount: 25, reason: "Компенсация" },
      createId,
    );

    expect(retry.attempt).toBe(first.attempt);
    expect(retry.values.reason).toBe("Компенсация");
    expect(createId).toHaveBeenCalledTimes(1);
  });

  it("creates a fresh UUID after the operation payload changes", () => {
    const ids = ["attempt-1", "attempt-2"];
    const createId = vi.fn(() => ids.shift() ?? "unexpected");
    const first = resolveCreditAdjustmentAttempt(
      null,
      { amount: 25, reason: "Компенсация" },
      createId,
    );
    const changed = resolveCreditAdjustmentAttempt(
      first.attempt,
      { amount: 30, reason: "Компенсация" },
      createId,
    );

    expect(changed.attempt.idempotencyKey).toBe("attempt-2");
    expect(changed.attempt).not.toBe(first.attempt);
  });
});

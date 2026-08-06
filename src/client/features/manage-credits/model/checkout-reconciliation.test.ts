import assert from "node:assert/strict";
import test from "node:test";
import { checkoutControlsDisabled } from "./presentation.ts";
import {
  CheckoutReconciliationError,
  reconcileCheckoutOutcome,
} from "./checkout-reconciliation.ts";

type CheckoutOrder = {
  id: string;
  status: "PENDING" | "PAID";
};

test("an ambiguous POST is resolved by the authoritative terminal owned-order read", async () => {
  let authoritative: {
    order: CheckoutOrder;
    balance: number | null;
  } = {
    order: { id: "order-1", status: "PENDING" },
    balance: null,
  };
  let finishRead: (() => void) | undefined;
  const readGate = new Promise<void>((resolve) => {
    finishRead = resolve;
  });

  const reconciliation = reconcileCheckoutOutcome({
    submitOutcome: async () => {
      authoritative = {
        order: { id: "order-1", status: "PAID" },
        balance: 70,
      };
      throw new SyntaxError("response body was lost");
    },
    readOwnedOrder: async () => {
      await readGate;
      return authoritative;
    },
  });

  assert.equal(
    checkoutControlsDisabled("PENDING", {
      requestPending: true,
      reconciliationUnresolved: false,
    }),
    true,
  );

  finishRead?.();
  assert.deepEqual(await reconciliation, {
    order: { id: "order-1", status: "PAID" },
    balance: 70,
    submissionError: null,
  });
});

test("controls remain disabled when the authoritative reconciliation cannot complete", async () => {
  await assert.rejects(
    () =>
      reconcileCheckoutOutcome({
        submitOutcome: async () => {
          throw new TypeError("connection closed");
        },
        readOwnedOrder: async () => {
          throw new TypeError("owned-order read unavailable");
        },
      }),
    CheckoutReconciliationError,
  );

  assert.equal(
    checkoutControlsDisabled("PENDING", {
      requestPending: false,
      reconciliationUnresolved: true,
    }),
    true,
  );
});

test("POST error followed by authoritative PENDING remains unresolved with controls disabled", async () => {
  let reconciliationError: unknown;
  try {
    await reconcileCheckoutOutcome({
      submitOutcome: async () => {
        throw new TypeError("response aborted");
      },
      readOwnedOrder: async () => ({
        order: { id: "order-1", status: "PENDING" },
        balance: null,
      }),
    });
  } catch (error) {
    reconciliationError = error;
  }

  assert.ok(reconciliationError instanceof CheckoutReconciliationError);
  assert.equal(
    checkoutControlsDisabled("PENDING", {
      requestPending: false,
      reconciliationUnresolved:
        reconciliationError instanceof CheckoutReconciliationError,
    }),
    true,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { GenerationReservationError } from "./operations.ts";
import {
  handleRefinementGenerationReservation,
  handleRetryGenerationReservation,
  handleRootGenerationReservation,
} from "./route-handlers.ts";

const insufficient = () => {
  throw new GenerationReservationError(
    "INSUFFICIENT_CREDITS",
    "Недостаточно кредитов для генерации",
  );
};

async function assertInsufficientEnvelope(
  response: Response,
  requestId: string,
) {
  assert.equal(response.status, 402);
  assert.equal(response.headers.get("x-request-id"), requestId);
  assert.deepEqual(await response.json(), {
    error: {
      code: "INSUFFICIENT_CREDITS",
      message: "Недостаточно кредитов для генерации",
    },
    meta: { requestId },
  });
}

test("root generation route handler preserves the authoritative 402 contract", async () => {
  const response = await handleRootGenerationReservation(
    {
      userId: "user-1",
      projectId: "project-1",
      prompt: "redesign",
      aspectRatio: "RATIO_16_9",
      idempotencyKey: "root-attempt-1234567890",
    },
    "request-root",
    {
      reserve: async () => insufficient(),
      schedule: () => assert.fail("insufficient reservation must not schedule"),
    },
  );

  await assertInsufficientEnvelope(response, "request-root");
});

test("refinement route handler preserves the authoritative 402 contract", async () => {
  const response = await handleRefinementGenerationReservation(
    {
      userId: "user-1",
      parentGenerationId: "generation-parent",
      prompt: "refine",
      referenceFileIds: [],
      idempotencyKey: "refinement-attempt-1234567890",
    },
    "request-refinement",
    {
      reserve: async () => insufficient(),
      schedule: () => assert.fail("insufficient reservation must not schedule"),
    },
  );

  await assertInsufficientEnvelope(response, "request-refinement");
});

test("retry route handler preserves the authoritative 402 contract", async () => {
  const response = await handleRetryGenerationReservation(
    {
      userId: "user-1",
      projectId: "project-1",
      prompt: "retry",
      aspectRatio: "RATIO_16_9",
      idempotencyKey:
        "retry:generation-failed:client-attempt-1234567890",
    },
    "generation-failed",
    "request-retry",
    {
      reserve: async () => insufficient(),
      schedule: () => assert.fail("insufficient reservation must not schedule"),
    },
  );

  await assertInsufficientEnvelope(response, "request-retry");
});

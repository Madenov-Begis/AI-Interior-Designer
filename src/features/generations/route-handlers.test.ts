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
      idempotencyKey: "retry:generation-failed:client-attempt-1234567890",
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

test("root, refinement, and retry route boundaries map injected async rejection to route-specific JSON", async () => {
  const rejectingDependencies = {
    reserve: async () => {
      await Promise.resolve();
      throw new Error("DATABASE_UNAVAILABLE");
    },
    schedule: () => assert.fail("rejected reservation must not schedule"),
  };
  const cases = [
    {
      requestId: "request-root-unexpected",
      code: "GENERATION_CREATE_FAILED",
      message: "Не удалось создать генерацию",
      invoke: () =>
        handleRootGenerationReservation(
          {
            userId: "user-1",
            projectId: "project-1",
            prompt: "redesign",
            aspectRatio: "RATIO_16_9",
            idempotencyKey: "root-attempt-1234567890",
          },
          "request-root-unexpected",
          rejectingDependencies,
        ),
    },
    {
      requestId: "request-refinement-unexpected",
      code: "REFINEMENT_CREATE_FAILED",
      message: "Не удалось создать доработку",
      invoke: () =>
        handleRefinementGenerationReservation(
          {
            userId: "user-1",
            parentGenerationId: "generation-parent",
            prompt: "refine",
            referenceFileIds: [],
            idempotencyKey: "refinement-attempt-1234567890",
          },
          "request-refinement-unexpected",
          rejectingDependencies,
        ),
    },
    {
      requestId: "request-retry-unexpected",
      code: "RETRY_FAILED",
      message: "Не удалось повторить генерацию",
      invoke: () =>
        handleRetryGenerationReservation(
          {
            userId: "user-1",
            projectId: "project-1",
            prompt: "retry",
            aspectRatio: "RATIO_16_9",
            idempotencyKey: "retry:generation-failed:client-attempt-1234567890",
          },
          "generation-failed",
          "request-retry-unexpected",
          rejectingDependencies,
        ),
    },
  ] as const;

  for (const fallback of cases) {
    const response = await fallback.invoke();

    assert.equal(response.status, 500);
    assert.equal(response.headers.get("x-request-id"), fallback.requestId);
    assert.deepEqual(await response.json(), {
      error: {
        code: fallback.code,
        message: fallback.message,
      },
      meta: { requestId: fallback.requestId },
    });
  }
});

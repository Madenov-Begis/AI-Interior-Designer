import assert from "node:assert/strict";
import test from "node:test";
import {
  RefinementAttemptRegistry,
  refinementAttemptSignature,
} from "./refinement-attempt.ts";

test("the same refinement input reuses one key after an ambiguous failure", () => {
  const registry = new RefinementAttemptRegistry();
  const signature = refinementAttemptSignature({
    generationId: "generation-1",
    prompt: "Сделай фасады темнее",
    files: [],
    canvasState: null,
  });
  let created = 0;
  const createKey = () => `refinement-attempt-${++created}-key`;

  const first = registry.begin(signature, createKey);
  assert.equal(
    registry.recordFailure(signature, new TypeError("network failed")),
    "retained",
  );
  const replay = registry.begin(signature, createKey);

  assert.equal(replay.idempotencyKey, first.idempotencyKey);
  assert.equal(created, 1);
});

test("changed prompt or canvas state creates a distinct refinement attempt", () => {
  const registry = new RefinementAttemptRegistry();
  const base = {
    generationId: "generation-1",
    files: [],
  };
  const first = registry.begin(
    refinementAttemptSignature({
      ...base,
      prompt: "Сделай фасады темнее",
      canvasState: null,
    }),
    () => "first-refinement-key",
  );
  const changed = registry.begin(
    refinementAttemptSignature({
      ...base,
      prompt: "Сделай фасады светлее",
      canvasState: { version: 1 },
    }),
    () => "changed-refinement-key",
  );

  assert.notEqual(changed.idempotencyKey, first.idempotencyKey);
});

test("an authoritative response clears a refinement attempt", () => {
  const registry = new RefinementAttemptRegistry();
  const signature = "generation-1:input";
  let created = 0;
  const createKey = () => `refinement-attempt-${++created}-key`;

  const first = registry.begin(signature, createKey);
  assert.equal(
    registry.recordFailure(signature, { status: 409 }),
    "cleared",
  );
  const next = registry.begin(signature, createKey);

  assert.notEqual(next.idempotencyKey, first.idempotencyKey);
});

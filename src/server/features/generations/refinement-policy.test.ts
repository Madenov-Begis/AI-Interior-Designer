import assert from "node:assert/strict";
import test from "node:test";
import * as refinementPolicy from "./refinement-policy.ts";

const successfulParent = {
  id: crypto.randomUUID(),
  projectId: crypto.randomUUID(),
  modelId: crypto.randomUUID(),
  styleCode: "MODERN",
  roomTypeId: crypto.randomUUID(),
  roomCode: "living-room",
  roomName: "Гостиная",
  roomPrompt: "Назначение помещения: гостиная.",
  aspectRatio: "RATIO_16_9",
  resultOriginalId: crypto.randomUUID(),
  status: "SUCCEEDED",
} as const;

test("inherits immutable settings and uses the clean parent result", () => {
  assert.deepEqual(refinementPolicy.buildRefinementSnapshot(successfulParent), {
    parentGenerationId: successfulParent.id,
    projectId: successfulParent.projectId,
    styleCode: successfulParent.styleCode,
    roomTypeId: successfulParent.roomTypeId,
    roomCode: successfulParent.roomCode,
    roomName: successfulParent.roomName,
    roomPrompt: successfulParent.roomPrompt,
    aspectRatio: successfulParent.aspectRatio,
    sourceImageId: successfulParent.resultOriginalId,
  });
});

test("rejects a parent that has not succeeded", () => {
  assert.throws(
    () =>
      refinementPolicy.buildRefinementSnapshot({
        ...successfulParent,
        status: "FAILED",
      }),
    /GENERATION_NOT_REFINABLE/,
  );
});

test("rejects a parent without a clean original result", () => {
  assert.throws(
    () =>
      refinementPolicy.buildRefinementSnapshot({
        ...successfulParent,
        resultOriginalId: null,
      }),
    /GENERATION_RESULT_MISSING/,
  );
});

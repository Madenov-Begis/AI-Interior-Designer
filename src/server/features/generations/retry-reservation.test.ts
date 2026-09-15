import assert from "node:assert/strict";
import test from "node:test";
import { buildRetryReservationPlan } from "./retry-reservation.ts";

const base = {
  projectId: "project-1",
  prompt: "Keep the room geometry",
  styleCode: "japandi",
  roomTypeId: "room-type-1",
  roomCode: "living-room",
  roomName: "Гостиная",
  roomPrompt: "Назначение помещения: гостиная.",
  aspectRatio: "RATIO_4_3" as const,
  visualPromptImageId: null,
  references: [{ fileId: "reference-1" }],
};

test("a failed root retry stays a root generation", () => {
  assert.deepEqual(
    buildRetryReservationPlan({ ...base, parentGenerationId: null }),
    {
      kind: "root",
      input: {
        projectId: "project-1",
        prompt: "Keep the room geometry",
        aspectRatio: "RATIO_4_3",
        styleCode: "japandi",
        roomSnapshot: {
          id: "room-type-1",
          code: "living-room",
          name: "Гостиная",
          promptModifier: "Назначение помещения: гостиная.",
        },
      },
    },
  );
});

test("a failed refinement retry keeps its parent and original inputs", () => {
  assert.deepEqual(
    buildRetryReservationPlan({
      ...base,
      parentGenerationId: "parent-1",
      visualPromptImageId: "visual-prompt-1",
      references: [{ fileId: "reference-1" }, { fileId: "reference-2" }],
    }),
    {
      kind: "refinement",
      input: {
        parentGenerationId: "parent-1",
        prompt: "Keep the room geometry",
        referenceFileIds: ["reference-1", "reference-2"],
        visualPromptImageId: "visual-prompt-1",
      },
    },
  );
});

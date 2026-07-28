import assert from "node:assert/strict";
import test from "node:test";
import * as generationSchemas from "./schema.ts";

test("rejects client-controlled model selection for a root generation", () => {
  assert.throws(() =>
    generationSchemas.createGenerationSchema.parse({
      projectId: crypto.randomUUID(),
      prompt: "Сделай современный интерьер",
      modelCode: "customer-choice",
      aspectRatio: "RATIO_16_9",
    }),
  );
});

test("keeps ordered references in a strict refinement input", () => {
  const firstReferenceId = crypto.randomUUID();
  const secondReferenceId = crypto.randomUUID();
  const schema = generationSchemas.createRefinementSchema;

  assert.ok(schema, "createRefinementSchema must be exported");
  assert.deepEqual(
    schema.parse({
      prompt: "Сделай фасады темнее",
      referenceFileIds: [firstReferenceId, secondReferenceId],
    }),
    {
      prompt: "Сделай фасады темнее",
      referenceFileIds: [firstReferenceId, secondReferenceId],
    },
  );
  assert.throws(() =>
    schema.parse({
      prompt: "Сделай фасады темнее",
      referenceFileIds: [],
      modelCode: "customer-choice",
    }),
  );
});

test("requires refinement overlay and canvas state together", () => {
  const schema = generationSchemas.refinementVisualPromptPairSchema;

  assert.ok(schema, "refinementVisualPromptPairSchema must be exported");
  assert.deepEqual(
    schema.parse({ overlayPresent: false, canvasStatePresent: false }),
    { overlayPresent: false, canvasStatePresent: false },
  );
  assert.deepEqual(
    schema.parse({ overlayPresent: true, canvasStatePresent: true }),
    { overlayPresent: true, canvasStatePresent: true },
  );
  assert.throws(() =>
    schema.parse({ overlayPresent: true, canvasStatePresent: false }),
  );
  assert.throws(() =>
    schema.parse({ overlayPresent: false, canvasStatePresent: true }),
  );
});

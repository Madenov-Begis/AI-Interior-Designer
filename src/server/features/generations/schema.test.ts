import assert from "node:assert/strict";
import test from "node:test";
import * as generationSchemas from "./schema.ts";

test("rejects client-controlled model selection for a root generation", () => {
  assert.throws(() =>
    generationSchemas.createGenerationSchema.parse({
      projectId: crypto.randomUUID(),
      roomTypeId: crypto.randomUUID(),
      prompt: "Сделай современный интерьер",
      modelCode: "customer-choice",
      aspectRatio: "RATIO_16_9",
    }),
  );
});

test("requires a room type for every new root generation", () => {
  const valid = {
    projectId: crypto.randomUUID(),
    roomTypeId: crypto.randomUUID(),
    prompt: "Сделай современный интерьер",
    aspectRatio: "RATIO_16_9",
  };
  assert.equal(generationSchemas.createGenerationSchema.safeParse(valid).success, true);
  assert.equal(
    generationSchemas.createGenerationSchema.safeParse({
      ...valid,
      roomTypeId: undefined,
    }).success,
    false,
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

test("accepts bounded v2 placement regions and rejects out-of-bounds regions", async () => {
  const { visualPromptPlacementRegionSchema } = await import(
    "../visual-prompt/placement-schema.ts"
  );
  const region = {
    left: 0.8,
    top: 0.8,
    width: 0.15,
    height: 0.15,
    color: "#afea4d",
    kind: "stroke" as const,
  };

  assert.deepEqual(visualPromptPlacementRegionSchema.parse(region), region);
  assert.throws(() =>
    visualPromptPlacementRegionSchema.parse({
      ...region,
      left: 0.9,
      width: 0.2,
    }),
  );
});

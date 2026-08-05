import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  INTERIOR_IMAGE_CLASSIFIER_PROMPT,
  parseInteriorImageDecision,
} from "./interior-image-policy.ts";

test("accepts only an exact interior classifier decision", () => {
  assert.equal(parseInteriorImageDecision("INTERIOR"), "INTERIOR");
  assert.equal(parseInteriorImageDecision("  not_interior\n"), "NOT_INTERIOR");
  assert.equal(parseInteriorImageDecision("probably interior"), null);
  assert.equal(parseInteriorImageDecision(undefined), null);
});

test("classifier permits unfinished and commercial interiors but rejects exteriors", () => {
  assert.match(INTERIOR_IMAGE_CLASSIFIER_PROMPT, /чернового ремонта/);
  assert.match(INTERIOR_IMAGE_CLASSIFIER_PROMPT, /магазины/);
  assert.match(INTERIOR_IMAGE_CLASSIFIER_PROMPT, /фасады зданий/);
  assert.match(INTERIOR_IMAGE_CLASSIFIER_PROMPT, /неоднозначные изображения/);
});

test("source upload checks image content before creating storage paths", async () => {
  const uploadSource = await readFile(
    new URL("./source-upload.ts", import.meta.url),
    "utf8",
  );
  const technicalValidation = uploadSource.indexOf("validateSourceImage(file)");
  const semanticValidation = uploadSource.indexOf(
    "validateInteriorSourceImage(image)",
  );
  const storagePathCreation = uploadSource.indexOf("const sourcePath");

  assert.ok(technicalValidation >= 0);
  assert.ok(semanticValidation > technicalValidation);
  assert.ok(storagePathCreation > semanticValidation);
});

test("validation uses a text-capable multimodal model independently of image generation", async () => {
  const validatorSource = await readFile(
    new URL("./interior-image-validator.ts", import.meta.url),
    "utf8",
  );

  assert.match(validatorSource, /"gemini-2\.5-flash"/);
  assert.doesNotMatch(validatorSource, /process\.env\.VERTEX_IMAGE_MODEL/);
  assert.match(validatorSource, /thinkingBudget: 0/);
});

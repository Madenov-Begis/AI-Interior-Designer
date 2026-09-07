import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  GENERATION_IMAGE_SIZE,
  GENERATION_WEBP_OPTIONS,
} from "./generation-image.ts";
import { INTERIOR_DESIGN_SYSTEM_PROMPT } from "./professional-system-prompt.ts";

test("defines the non-negotiable professional interior design role", () => {
  assert.match(
    INTERIOR_DESIGN_SYSTEM_PROMPT,
    /ведущий архитектор и профессиональный дизайнер интерьеров/,
  );
  assert.match(INTERIOR_DESIGN_SYSTEM_PROMPT, /Строго сохраняй:/);
  assert.match(
    INTERIOR_DESIGN_SYSTEM_PROMPT,
    /Изменение конструктивной геометрии допускается только по прямому указанию пользователя/,
  );
  assert.match(
    INTERIOR_DESIGN_SYSTEM_PROMPT,
    /Верни только одну готовую фотореалистичную визуализацию/,
  );
});

test("passes the professional role through the Gemini system instruction", async () => {
  const providerSource = await readFile(
    new URL("./vertex-provider.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    providerSource,
    /systemInstruction: INTERIOR_DESIGN_SYSTEM_PROMPT/,
  );
  assert.match(providerSource, /input\.operation === "refinement"/);
  assert.match(providerSource, /exact existing interior result selected/);
  assert.match(providerSource, /Do not redesign it from scratch/);
  assert.match(providerSource, /imageSize: GENERATION_IMAGE_SIZE/);
  assert.match(
    providerSource,
    /imageOutputOptions: \{ mimeType: "image\/png" \}/,
  );
  assert.equal(GENERATION_IMAGE_SIZE, "1K");
  assert.equal(GENERATION_WEBP_OPTIONS.lossless, true);
  assert.equal(GENERATION_WEBP_OPTIONS.effort, 6);
});

test("publishes the clean provider result for every plan", async () => {
  const workerSource = await readFile(
    new URL("./worker.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(
    workerSource,
    /addWatermark|watermarkRequired|AI INTERIOR/,
  );
  assert.match(workerSource, /\.upload\(originalPath, finalizedOutput\.image/);
});

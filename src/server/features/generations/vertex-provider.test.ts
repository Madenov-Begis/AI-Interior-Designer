import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./vertex-provider.ts", import.meta.url), "utf8");
const worker = readFileSync(new URL("./worker.ts", import.meta.url), "utf8");

test("generation never sends the stored visual-prompt pixels to Gemini", () => {
  assert.doesNotMatch(source, /input\.visualPrompt/);
  assert.doesNotMatch(source, /annotated copy/);
  assert.doesNotMatch(worker, /downloadStoredFile\(generation\.visualPromptImage\)/);
  assert.match(source, /imagePart\(input\.source\)/);
  assert.match(source, /input\.references/);
});

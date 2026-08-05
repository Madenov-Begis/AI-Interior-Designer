import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./generation-refinement-composer.tsx", import.meta.url),
  "utf8",
);
const overlaySource = readFileSync(
  new URL("./generation-context-overlay.tsx", import.meta.url),
  "utf8",
);

test("refinement editor is an anchored non-modal popover", () => {
  assert.doesNotMatch(source, /<dialog|showModal\(|::backdrop/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /generation-refinement-popover/);
});

test("refinement editor keeps keyboard close and prompt autofocus", () => {
  assert.match(source, /event\.key !== "Escape"/);
  assert.match(source, /promptRef\.current\?\.focus\(\)/);
});

test("context actions keep only refinement and removal", () => {
  assert.match(overlaySource, /Доработать/);
  assert.match(overlaySource, /Удалить/);
  assert.doesNotMatch(overlaySource, /Дублировать|onDuplicate|\bCopy\b/);
});

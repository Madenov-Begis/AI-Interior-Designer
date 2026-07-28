import assert from "node:assert/strict";
import test from "node:test";
import { nextRefinementOverlayState } from "./refinement-overlay-state.ts";

test("selection keeps the refinement editor closed", () => {
  assert.deepEqual(
    nextRefinementOverlayState({ editorOpen: false }, "select"),
    { editorOpen: false },
  );
});

test("toggle opens and closes the refinement editor", () => {
  assert.deepEqual(
    nextRefinementOverlayState({ editorOpen: false }, "toggle"),
    { editorOpen: true },
  );
  assert.deepEqual(
    nextRefinementOverlayState({ editorOpen: true }, "toggle"),
    { editorOpen: false },
  );
});

test("close and submit success close the refinement editor", () => {
  assert.deepEqual(
    nextRefinementOverlayState({ editorOpen: true }, "close"),
    { editorOpen: false },
  );
  assert.deepEqual(
    nextRefinementOverlayState({ editorOpen: true }, "submit-success"),
    { editorOpen: false },
  );
});

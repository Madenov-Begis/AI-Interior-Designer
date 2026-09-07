import assert from "node:assert/strict";
import test from "node:test";
import { CanvasHistory } from "./canvas-history.ts";

test("history retains at most 100 states and a new edit drops redo", () => {
  const history = new CanvasHistory();
  for (let i = 0; i < 120; i++) history.capture(String(i));
  let undoCount = 0;
  while (history.state.canUndo) {
    history.move(-1);
    undoCount++;
  }
  assert.equal(undoCount, 99);
  assert.equal(history.peek(1), "21");
  history.capture("new edit");
  assert.equal(history.state.canRedo, false);
  assert.equal(history.capture("new edit"), false);
});

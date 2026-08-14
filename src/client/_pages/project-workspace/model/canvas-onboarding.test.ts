import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceCanvasOnboarding,
  CANVAS_ONBOARDING_STEP,
} from "./canvas-onboarding.ts";

test("onboarding advances only from the action expected by the current step", () => {
  assert.equal(
    advanceCanvasOnboarding(
      CANVAS_ONBOARDING_STEP.drawing,
      CANVAS_ONBOARDING_STEP.drawing,
    ),
    CANVAS_ONBOARDING_STEP.references,
  );
  assert.equal(
    advanceCanvasOnboarding(
      CANVAS_ONBOARDING_STEP.drawing,
      CANVAS_ONBOARDING_STEP.styles,
    ),
    CANVAS_ONBOARDING_STEP.drawing,
  );
});

test("the last step cannot advance past the tour", () => {
  assert.equal(
    advanceCanvasOnboarding(
      CANVAS_ONBOARDING_STEP.refinement,
      CANVAS_ONBOARDING_STEP.refinement,
    ),
    CANVAS_ONBOARDING_STEP.refinement,
  );
});

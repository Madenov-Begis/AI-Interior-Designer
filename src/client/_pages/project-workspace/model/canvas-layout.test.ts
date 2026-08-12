import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCanvasLayout,
  canvasCardHeight,
  containedMediaRect,
  constrainCanvasTransform,
  generationPosition,
} from "./canvas-layout.ts";
import {
  nearestGenerationAspectRatio,
  resolveGenerationAspectRatio,
} from "./generation-aspect-ratio.ts";

test("detects the nearest supported format from the source dimensions", () => {
  assert.equal(nearestGenerationAspectRatio(1600, 1200), "RATIO_4_3");
  assert.equal(nearestGenerationAspectRatio(1200, 1600), "RATIO_3_4");
  assert.equal(nearestGenerationAspectRatio(1920, 1080), "RATIO_16_9");
  assert.equal(nearestGenerationAspectRatio(1080, 1920), "RATIO_9_16");
  assert.equal(nearestGenerationAspectRatio(1000, 960), "RATIO_1_1");
});

test("a manual format overrides the detected source format", () => {
  assert.equal(resolveGenerationAspectRatio("SOURCE", 1600, 1200), "RATIO_4_3");
  assert.equal(
    resolveGenerationAspectRatio("RATIO_16_9", 1600, 1200),
    "RATIO_16_9",
  );
});

test("sizes the shared comparison frame from the source ratio", () => {
  assert.equal(canvasCardHeight(1024, 768), 640);
  assert.equal(canvasCardHeight(1024, 576), 497.5);
  assert.equal(canvasCardHeight(null, null), 610);
});

test("contains wide media inside a portrait frame without stretching", () => {
  assert.deepEqual(containedMediaRect(900, 1200, 1600, 900), {
    left: 0,
    top: 28.90625,
    width: 100,
    height: 42.1875,
  });
});

test("contains portrait media inside a wide frame without stretching", () => {
  assert.deepEqual(containedMediaRect(1600, 900, 900, 1200), {
    left: 28.90625,
    top: 0,
    width: 42.1875,
    height: 100,
  });
});

test("uses the entire frame when media dimensions are unavailable", () => {
  assert.deepEqual(containedMediaRect(1600, 900, null, null), {
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
});

test("keeps up to four generations in one horizontal row", () => {
  const layout = calculateCanvasLayout({
    generationHeights: [610, 610, 610],
    sourceCardHeight: 640,
    viewportWidth: 1200,
  });

  assert.deepEqual(layout.generationPositions, [
    generationPosition(0),
    generationPosition(1),
    generationPosition(2),
  ]);
});

test("wraps a larger generation set using the available viewport width", () => {
  const layout = calculateCanvasLayout({
    generationHeights: [610, 610, 610, 610, 610],
    sourceCardHeight: 500,
    viewportWidth: 2000,
  });

  assert.deepEqual(layout.generationPositions, [
    { x: 912, y: 80 },
    { x: 1744, y: 80 },
    { x: 912, y: 762 },
    { x: 1744, y: 762 },
    { x: 912, y: 1444 },
  ]);
  assert.deepEqual(layout.worldBounds, {
    minX: 0,
    minY: 0,
    maxX: 2584,
    maxY: 2134,
  });
});

test("constrains a transform without changing its scale", () => {
  assert.deepEqual(
    constrainCanvasTransform(
      { x: 999, y: -999, scale: 1 },
      { width: 800, height: 600 },
      { minX: 0, minY: 0, maxX: 1000, maxY: 800 },
      { top: 40, right: 40, bottom: 40, left: 40 },
    ),
    { x: 40, y: -240, scale: 1 },
  );
});

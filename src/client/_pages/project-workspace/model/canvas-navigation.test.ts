import assert from "node:assert/strict";
import test from "node:test";
import {
  canvasWheelAction,
  clampCanvasScale,
  MIN_CANVAS_SCALE,
  zoomTransformAroundPoint,
} from "./canvas-navigation.ts";

test("canvas zooms out to five percent and never below it", () => {
  assert.equal(clampCanvasScale(0.25), 0.25);
  assert.equal(clampCanvasScale(0.05), MIN_CANVAS_SCALE);
  assert.equal(clampCanvasScale(0.01), MIN_CANVAS_SCALE);
});

test("zoom keeps the world point under the pointer stable", () => {
  const next = zoomTransformAroundPoint(
    { x: -100, y: -50, scale: 1 },
    0.5,
    { x: 300, y: 250 },
  );

  assert.deepEqual(next, { x: 100, y: 100, scale: 0.5 });
});

test("wheel pans and the zoom modifier changes scale", () => {
  assert.deepEqual(
    canvasWheelAction({
      deltaX: 0,
      deltaY: 120,
      zoomModifier: false,
      preferHorizontal: true,
    }),
    { type: "pan", deltaX: 120, deltaY: 0 },
  );
  assert.equal(
    canvasWheelAction({
      deltaX: 0,
      deltaY: -100,
      zoomModifier: true,
      preferHorizontal: false,
    }).type,
    "zoom",
  );
});

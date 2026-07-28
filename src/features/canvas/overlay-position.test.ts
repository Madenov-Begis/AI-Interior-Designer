import assert from "node:assert/strict";
import test from "node:test";
import {
  positionFloatingOverlay,
  screenRectForWorldItem,
} from "./overlay-position.ts";

test("converts a generation world rect to screen coordinates", () => {
  assert.deepEqual(
    screenRectForWorldItem({
      item: { x: 100, y: 80, width: 760, height: 610 },
      transform: { x: -20, y: 10, scale: 0.5 },
    }),
    {
      left: 30,
      top: 50,
      right: 410,
      bottom: 355,
      width: 380,
      height: 305,
    },
  );
});

test("places the overlay above when it cannot fit below", () => {
  assert.deepEqual(
    positionFloatingOverlay({
      anchor: {
        left: 200,
        top: 300,
        right: 700,
        bottom: 700,
        width: 500,
        height: 400,
      },
      viewport: { width: 900, height: 760 },
      overlay: { width: 560, height: 300 },
      margin: 16,
      gap: 12,
    }),
    { left: 170, top: 16, placement: "above" },
  );
});

test("places and clamps the overlay below when space is available", () => {
  assert.deepEqual(
    positionFloatingOverlay({
      anchor: {
        left: -40,
        top: 20,
        right: 340,
        bottom: 220,
        width: 380,
        height: 200,
      },
      viewport: { width: 800, height: 900 },
      overlay: { width: 560, height: 300 },
      margin: 16,
      gap: 12,
    }),
    { left: 16, top: 232, placement: "below" },
  );
});

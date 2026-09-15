import assert from "node:assert/strict";
import test from "node:test";
import { placementRegionsFromObjects } from "./visual-prompt-regions.ts";

function object(
  bounds: { left: number; top: number; width: number; height: number },
  input: {
    type?: string;
    stroke?: string;
    visible?: boolean;
    globalCompositeOperation?: string;
  } = {},
) {
  return { ...input, getBoundingRect: () => bounds };
}

test("normalizes transformed Fabric bounding boxes in scene coordinates", () => {
  assert.deepEqual(
    placementRegionsFromObjects(
      [
        object(
          { left: 1280, top: 720, width: 240, height: 135 },
          { type: "rect", stroke: "#AFEA4D" },
        ),
      ],
      1600,
      900,
    ),
    [
      {
        left: 0.8,
        top: 0.8,
        width: 0.15,
        height: 0.15,
        color: "#afea4d",
        kind: "rectangle",
      },
    ],
  );
});

test("clamps regions to the canvas and ignores erased or invisible objects", () => {
  assert.deepEqual(
    placementRegionsFromObjects(
      [
        object({ left: -20, top: 80, width: 60, height: 40 }),
        object(
          { left: 50, top: 50, width: 20, height: 20 },
          { visible: false },
        ),
        object(
          { left: 70, top: 50, width: 20, height: 20 },
          { globalCompositeOperation: "destination-out" },
        ),
      ],
      100,
      100,
    ),
    [
      {
        left: 0,
        top: 0.8,
        width: 0.4,
        height: 0.2,
        color: "#afea4d",
        kind: "stroke",
      },
    ],
  );
});

test("merges connected strokes of the same color and sorts separate zones", () => {
  assert.deepEqual(
    placementRegionsFromObjects(
      [
        object(
          { left: 70, top: 70, width: 10, height: 10 },
          { stroke: "red" },
        ),
        object(
          { left: 10, top: 10, width: 10, height: 10 },
          { stroke: "red" },
        ),
        object(
          { left: 19, top: 18, width: 11, height: 12 },
          { stroke: "red" },
        ),
        object(
          { left: 18, top: 18, width: 8, height: 8 },
          { stroke: "blue" },
        ),
      ],
      100,
      100,
    ),
    [
      {
        left: 0.1,
        top: 0.1,
        width: 0.2,
        height: 0.2,
        color: "red",
        kind: "stroke",
      },
      {
        left: 0.18,
        top: 0.18,
        width: 0.08,
        height: 0.08,
        color: "blue",
        kind: "stroke",
      },
      {
        left: 0.7,
        top: 0.7,
        width: 0.1,
        height: 0.1,
        color: "red",
        kind: "stroke",
      },
    ],
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  canvasToPngBlob,
  type CanvasPngExportOptions,
} from "./visual-prompt-canvas-export.ts";

test("exports the visual prompt in logical canvas pixels without Retina scaling", async () => {
  const expected = new Blob(["overlay"], { type: "image/png" });
  let received: CanvasPngExportOptions | undefined;

  const actual = await canvasToPngBlob({
    async toBlob(options) {
      received = options;
      return expected;
    },
  });

  assert.equal(actual, expected);
  assert.deepEqual(received, {
    format: "png",
    multiplier: 1,
    enableRetinaScaling: false,
  });
});

test("rejects an empty canvas export", async () => {
  await assert.rejects(
    canvasToPngBlob({
      async toBlob() {
        return null;
      },
    }),
    /Не удалось подготовить разметку/,
  );
});

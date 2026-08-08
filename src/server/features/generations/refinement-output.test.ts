import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { normalizeRefinementOutput } from "./refinement-output.ts";

test("refinement output has the exact pixel dimensions of its parent", async () => {
  const providerImage = await sharp({
    create: {
      width: 120,
      height: 80,
      channels: 3,
      background: "#778899",
    },
  })
    .png()
    .toBuffer();

  const result = await normalizeRefinementOutput(providerImage, 60, 40);
  const metadata = await sharp(result.image).metadata();

  assert.equal(result.width, 60);
  assert.equal(result.height, 40);
  assert.equal(result.mimeType, "image/webp");
  assert.equal(metadata.width, 60);
  assert.equal(metadata.height, 40);
});

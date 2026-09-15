import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { prepareVisualPromptOverlay } from "./overlay-image.ts";

test("keeps the visual prompt transparent instead of flattening it onto a room image", async () => {
  const overlay = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 4,
      background: "#00000000",
    },
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="4" height="4"><rect width="4" height="4" fill="#afea4d"/></svg>',
        ),
        left: 3,
        top: 3,
      },
    ])
    .png()
    .toBuffer();

  const prepared = await prepareVisualPromptOverlay(overlay, 20, 20);
  const { data, info } = await sharp(prepared)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alphaAt = (x: number, y: number) =>
    data[(y * info.width + x) * info.channels + 3];

  assert.equal(info.width, 20);
  assert.equal(info.height, 20);
  assert.equal(alphaAt(0, 0), 0);
  assert.ok((alphaAt(10, 10) ?? 0) > 0);
});

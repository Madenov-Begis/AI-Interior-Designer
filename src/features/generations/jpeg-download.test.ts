import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  convertGenerationDownloadToJpeg,
  generationDownloadFilename,
} from "./jpeg-download.ts";

test("converts a transparent stored image to an opaque sRGB JPEG", async () => {
  const source = await sharp({
    create: {
      width: 3,
      height: 2,
      channels: 4,
      background: { r: 80, g: 120, b: 160, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer();

  const jpeg = await convertGenerationDownloadToJpeg(source);
  const metadata = await sharp(jpeg).metadata();

  assert.deepEqual([...jpeg.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 3);
  assert.equal(metadata.height, 2);
  assert.equal(metadata.hasAlpha, false);
  assert.equal(metadata.space, "srgb");
});

test("creates a dated JPG attachment filename", () => {
  assert.equal(
    generationDownloadFilename(new Date("2026-07-26T18:00:00.000Z")),
    "interior-design-2026-07-26.jpg",
  );
});

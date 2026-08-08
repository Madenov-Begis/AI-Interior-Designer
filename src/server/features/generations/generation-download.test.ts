import assert from "node:assert/strict";
import test from "node:test";
import { generationDownloadFilename } from "./generation-download.ts";

test("keeps the lossless stored format in the download filename", () => {
  assert.equal(
    generationDownloadFilename(
      new Date("2026-07-26T18:00:00.000Z"),
      "image/webp",
    ),
    "interior-design-2026-07-26.webp",
  );
});

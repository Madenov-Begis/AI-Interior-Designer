import assert from "node:assert/strict";
import test from "node:test";
import { generationDownloadName } from "../model/generation-download.ts";

test("reads the server filename from download headers", () => {
  assert.equal(
    generationDownloadName(
      'attachment; filename="interior-design-2026-08-08.webp"',
    ),
    "interior-design-2026-08-08.webp",
  );
});

test("falls back to a safe WebP filename", () => {
  assert.equal(generationDownloadName(), "interior-design.webp");
  assert.equal(
    generationDownloadName("attachment; filename*=UTF-8''interior%20room.webp"),
    "interior room.webp",
  );
});

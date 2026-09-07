import assert from "node:assert/strict";
import test from "node:test";
import { stageUploadBody } from "./staged-upload.ts";

test("a 15 MB file bypasses the application request body and preserves fields", async () => {
  const file = new File([new Uint8Array(15 * 1024 * 1024)], "room.png", {
    type: "image/png",
  });
  const form = new FormData();
  form.append("file", file);
  form.append("prompt", "private prompt");
  const previous = globalThis.fetch;
  let sent: RequestInit | undefined;
  globalThis.fetch = async (_, init) => {
    sent = init;
    return new Response("{}", { status: 200 });
  };
  try {
    const result = await stageUploadBody(
      "/projects/project/source",
      form,
      async (input) => {
        assert.equal(input.sizeBytes, file.size);
        assert.equal(input.target, "/projects/project/source");
        return { id: "upload", url: "https://example.invalid/signed" };
      },
    );
    assert.equal(sent?.body, file);
    assert.equal(sent?.credentials, "omit");
    assert.deepEqual(result, {
      fields: { prompt: ["private prompt"] },
      uploads: [{ field: "file", id: "upload" }],
    });
    assert.ok(JSON.stringify(result).length < 1024);
  } finally {
    globalThis.fetch = previous;
  }
});

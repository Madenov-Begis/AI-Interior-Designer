import assert from "node:assert/strict";
import test from "node:test";
import {
  isAcceptedSourceFile,
  uploadProjectSource,
} from "./source-upload-client.ts";

test("uploads the selected file immediately to the project source endpoint", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const file = new File(["room"], "living-room.jpg", {
    type: "image/jpeg",
  });

  const data = await uploadProjectSource({
    projectId: "project-1",
    file,
    signal: new AbortController().signal,
    fetcher: async (input, init) => {
      calls.push({ input, init });
      return Response.json({ data: { mediaId: "media-1" } });
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0]?.input,
    "https://api.ruvie.cc/api/v1/projects/project-1/source",
  );
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal(data.mediaId, "media-1");
});

test("surfaces the API error message", async () => {
  await assert.rejects(
    uploadProjectSource({
      projectId: "project-1",
      file: new File(["bad"], "bad.jpg", { type: "image/jpeg" }),
      signal: new AbortController().signal,
      fetcher: async () =>
        Response.json(
          { error: { message: "Изображение слишком маленькое" } },
          { status: 422 },
        ),
    }),
    /Изображение слишком маленькое/,
  );
});

test("accepts only supported room image types within the size limit", () => {
  assert.equal(
    isAcceptedSourceFile(new File(["x"], "room.jpg", { type: "image/jpeg" })),
    true,
  );
  assert.equal(
    isAcceptedSourceFile(new File(["x"], "room.webp", { type: "image/webp" })),
    true,
  );
  assert.equal(
    isAcceptedSourceFile(new File(["x"], "room.gif", { type: "image/gif" })),
    false,
  );
  assert.equal(
    isAcceptedSourceFile({
      name: "huge.png",
      type: "image/png",
      size: 15 * 1024 * 1024 + 1,
    } as File),
    false,
  );
});

test("does not start a request after the upload signal was aborted", async () => {
  const controller = new AbortController();
  controller.abort();
  let called = false;

  await assert.rejects(
    uploadProjectSource({
      projectId: "project-1",
      file: new File(["room"], "room.jpg", { type: "image/jpeg" }),
      signal: controller.signal,
      fetcher: async () => {
        called = true;
        return Response.json({ data: {} });
      },
    }),
    (error: unknown) =>
      error instanceof DOMException && error.name === "AbortError",
  );
  assert.equal(called, false);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  createLatestSourceUpload,
  isAcceptedSourceFile,
  sourceProjectName,
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
  assert.equal(calls[0]?.input, "/api/v1/projects/project-1/source");
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

test("derives a safe project name from the source filename", () => {
  assert.equal(sourceProjectName("  living-room.final.jpg  "), "living-room.final");
  assert.equal(sourceProjectName(".jpg"), "Новый интерьер");
  assert.equal(sourceProjectName("x".repeat(140)), "x".repeat(120));
});

test("accepts only supported room image types within the size limit", () => {
  assert.equal(
    isAcceptedSourceFile(
      new File(["x"], "room.jpg", { type: "image/jpeg" }),
    ),
    true,
  );
  assert.equal(
    isAcceptedSourceFile(
      new File(["x"], "room.webp", { type: "image/webp" }),
    ),
    true,
  );
  assert.equal(
    isAcceptedSourceFile(
      new File(["x"], "room.gif", { type: "image/gif" }),
    ),
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

test("a newer source upload aborts the previous request", async () => {
  const signals: AbortSignal[] = [];
  let requestNumber = 0;
  const uploader = createLatestSourceUpload(async (_input, init) => {
    requestNumber += 1;
    const signal = init?.signal as AbortSignal;
    signals.push(signal);

    if (requestNumber === 1) {
      return await new Promise<Response>((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }

    return Response.json({ data: { mediaId: "second" } });
  });

  const first = uploader
    .upload(
      "project-1",
      new File(["first"], "first.jpg", { type: "image/jpeg" }),
    )
    .catch((error: unknown) => error);
  await Promise.resolve();
  const second = uploader.upload(
    "project-1",
    new File(["second"], "second.jpg", { type: "image/jpeg" }),
  );

  assert.equal(signals[0]?.aborted, true);
  assert.deepEqual(await second, { mediaId: "second" });
  assert.equal((await first as DOMException).name, "AbortError");
});

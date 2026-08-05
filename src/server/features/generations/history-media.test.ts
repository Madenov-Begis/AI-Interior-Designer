import assert from "node:assert/strict";
import test from "node:test";
import { attachHistoryResultUrls } from "./history-media.ts";

test("signs history images once per bucket and attaches URLs to items", async () => {
  const calls: Array<{ bucket: string; paths: string[] }> = [];
  const items = [
    {
      id: "generation-1",
      resultUser: { bucket: "results", path: "one.jpg" },
    },
    {
      id: "generation-2",
      resultUser: { bucket: "results", path: "two.jpg" },
    },
    {
      id: "generation-3",
      resultUser: { bucket: "archive", path: "three.jpg" },
    },
    {
      id: "generation-4",
      resultUser: null,
    },
  ];

  const result = await attachHistoryResultUrls(items, async (bucket, paths) => {
    calls.push({ bucket, paths });
    return paths.map((path) => ({
      path,
      signedUrl: `https://storage.example/${bucket}/${path}`,
    }));
  });

  assert.deepEqual(calls, [
    { bucket: "results", paths: ["one.jpg", "two.jpg"] },
    { bucket: "archive", paths: ["three.jpg"] },
  ]);
  assert.deepEqual(
    result.map((item) => item.resultUrl),
    [
      "https://storage.example/results/one.jpg",
      "https://storage.example/results/two.jpg",
      "https://storage.example/archive/three.jpg",
      null,
    ],
  );
});

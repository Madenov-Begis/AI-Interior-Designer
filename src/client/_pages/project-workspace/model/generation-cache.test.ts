import assert from "node:assert/strict";
import test from "node:test";
import {
  appendGenerationPage,
  mergeGenerationIntoList,
} from "./generation-cache.ts";
import type { WorkspaceGeneration } from "./workspace-types.ts";

const queued: WorkspaceGeneration = {
  id: "generation-1",
  parentGenerationId: null,
  status: "QUEUED",
  prompt: "Modern interior",
  aspectRatio: "16:9",
  resultUserId: null,
  resultUrl: null,
  resultUser: null,
  references: [],
  errorCode: null,
  errorMessage: null,
  createdAt: "2026-08-08T00:00:00.000Z",
  completedAt: null,
};

test("polling promotes a queued generation to processing in the list", () => {
  const current = { items: [queued], nextCursor: null, total: 1 };
  const next = mergeGenerationIntoList(current, {
    ...queued,
    status: "PROCESSING",
  });

  assert.equal(next.items[0]?.status, "PROCESSING");
  assert.notEqual(next, current);
});

test("an unchanged polling snapshot preserves query cache identity", () => {
  const current = { items: [queued], nextCursor: null, total: 1 };
  assert.equal(mergeGenerationIntoList(current, { ...queued }), current);
});

test("appending history keeps polled snapshots and all older rows without duplicates", () => {
  const current = {
    items: [{ ...queued, status: "SUCCEEDED" as const }],
    total: 3,
    nextCursor: "generation-1",
  };
  const next = appendGenerationPage(current, {
    items: [queued, { ...queued, id: "generation-2" }],
    nextCursor: "generation-2",
    total: 3,
  });
  assert.deepEqual(
    next.items.map((item) => item.id),
    ["generation-1", "generation-2"],
  );
  assert.equal(next.items[0]?.status, "SUCCEEDED");
  assert.equal(next.nextCursor, "generation-2");
  assert.equal(next.total, 3);
});

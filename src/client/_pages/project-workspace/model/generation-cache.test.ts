import assert from "node:assert/strict";
import test from "node:test";
import { mergeGenerationIntoList } from "./generation-cache.ts";
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

import assert from "node:assert/strict";
import test from "node:test";
import * as generationTree from "./tree.ts";

test("builds stable branch labels independent of input order", () => {
  const rootOne = { id: "a", parentGenerationId: null, createdAt: "2026-01-01T00:00:00.000Z" };
  const rootTwo = { id: "b", parentGenerationId: null, createdAt: "2026-01-02T00:00:00.000Z" };
  const childOne = { id: "c", parentGenerationId: "a", createdAt: "2026-01-03T00:00:00.000Z" };
  const childTwo = { id: "d", parentGenerationId: "a", createdAt: "2026-01-04T00:00:00.000Z" };
  const grandchild = { id: "e", parentGenerationId: "c", createdAt: "2026-01-05T00:00:00.000Z" };

  const labels = generationTree.buildGenerationLabels([
    grandchild,
    childTwo,
    rootTwo,
    childOne,
    rootOne,
  ]);

  assert.equal(labels.get("a"), "1");
  assert.equal(labels.get("b"), "2");
  assert.equal(labels.get("c"), "1.1");
  assert.equal(labels.get("d"), "1.2");
  assert.equal(labels.get("e"), "1.1.1");
});

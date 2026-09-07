import assert from "node:assert/strict";
import test from "node:test";
import { generationTreeLabels } from "./tree-labels.ts";

test("labels use the full project tree beyond twenty items and include ancestors", () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({
    id: `root-${i}`,
    projectId: "p",
    parentGenerationId: null,
    createdAt: new Date(i * 1000),
  }));
  const labels = generationTreeLabels(
    [
      ...rows,
      {
        id: "child",
        projectId: "p",
        parentGenerationId: "root-0",
        createdAt: new Date(40000),
      },
      {
        id: "grandchild",
        projectId: "p",
        parentGenerationId: "child",
        createdAt: new Date(50000),
      },
      {
        id: "other",
        projectId: "q",
        parentGenerationId: null,
        createdAt: new Date(0),
      },
    ].reverse(),
  );
  assert.equal(labels.get("root-29"), "30");
  assert.equal(labels.get("child"), "1.1");
  assert.equal(labels.get("grandchild"), "1.1.1");
  assert.equal(labels.get("other"), "1");
});

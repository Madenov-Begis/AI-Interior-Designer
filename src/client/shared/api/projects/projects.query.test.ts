import assert from "node:assert/strict";
import test from "node:test";
import { projectsQueries } from "./projects.query.ts";

test("workspace reads and invalidations share one project-scoped query key", () => {
  assert.deepEqual(projectsQueries.workspace("project-1").queryKey, [
    "projects",
    "project-1",
    "workspace",
  ]);
});

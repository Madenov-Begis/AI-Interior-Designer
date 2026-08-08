import assert from "node:assert/strict";
import test from "node:test";
import { getPaginationItems } from "./pagination.ts";

test("shows every page for short result sets", () => {
  assert.deepEqual(getPaginationItems(3, 5), [1, 2, 3, 4, 5]);
});

test("keeps the current page between ellipses", () => {
  assert.deepEqual(getPaginationItems(6, 12), [
    1,
    "ellipsis",
    5,
    6,
    7,
    "ellipsis",
    12,
  ]);
});

test("shows the final pages without a trailing ellipsis", () => {
  assert.deepEqual(getPaginationItems(11, 12), [1, "ellipsis", 9, 10, 11, 12]);
});

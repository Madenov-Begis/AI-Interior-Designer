import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profileSource = readFileSync(
  new URL("./profile-panel.tsx", import.meta.url),
  "utf8",
);

test("profile grid can shrink to the mobile viewport", () => {
  assert.match(
    profileSource,
    /grid min-w-0 grid-cols-\[minmax\(0,1fr\)\]/,
  );
  assert.match(profileSource, /<RuviePanel className="min-w-0 p-6">/);
  assert.match(profileSource, /<div className="grid min-w-0 gap-5">/);
  assert.match(
    profileSource,
    /mt-5 grid min-w-0 grid-cols-\[minmax\(0,1fr\)\] gap-3/,
  );
  assert.equal(profileSource.match(/flex min-h-36 min-w-0/g)?.length, 2);
});

test("profile actions stack on narrow screens", () => {
  assert.match(profileSource, /mt-5 flex flex-col gap-3 sm:flex-row/);
  assert.equal(profileSource.match(/className="w-full sm:w-auto"/g)?.length, 2);
});

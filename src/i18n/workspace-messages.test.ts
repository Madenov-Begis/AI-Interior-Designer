import assert from "node:assert/strict";
import test from "node:test";
import { formatAppMessage } from "./app-messages.ts";
import { workspaceMessages } from "./workspace-messages.ts";

test("workspace dictionaries have the same complete key set", () => {
  const englishKeys = Object.keys(workspaceMessages.en).sort();
  const uzbekKeys = Object.keys(workspaceMessages.uz).sort();

  assert.deepEqual(uzbekKeys, englishKeys);
  assert.ok(englishKeys.length > 100);
});

test("workspace translations do not fall back to Russian source strings", () => {
  for (const source of Object.keys(workspaceMessages.en)) {
    assert.notEqual(workspaceMessages.en[source as keyof typeof workspaceMessages.en], source);
    assert.notEqual(workspaceMessages.uz[source as keyof typeof workspaceMessages.uz], source);
  }
});

test("workspace messages interpolate dynamic values", () => {
  assert.equal(
    formatAppMessage("Option {number}, status {status}", {
      number: 2,
      status: "Ready",
    }),
    "Option 2, status Ready",
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { pageMessages } from "./page-messages.ts";

test("page dictionaries have the same complete key set", () => {
  const englishKeys = Object.keys(pageMessages.en).sort();
  const uzbekKeys = Object.keys(pageMessages.uz).sort();

  assert.deepEqual(uzbekKeys, englishKeys);
  assert.ok(englishKeys.length > 50);
});

test("page translations do not fall back to Russian source strings", () => {
  for (const source of Object.keys(pageMessages.en)) {
    assert.notEqual(pageMessages.en[source as keyof typeof pageMessages.en], source);
    assert.notEqual(pageMessages.uz[source as keyof typeof pageMessages.uz], source);
  }
});

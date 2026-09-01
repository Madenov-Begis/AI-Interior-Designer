import assert from "node:assert/strict";
import test from "node:test";
import { createPinnedLookup } from "./safe-fetch-lookup.ts";

test("pinned DNS lookup returns an address array when all=true", async () => {
  const lookup = createPinnedLookup({ address: "203.0.113.10", family: 4 });

  const result = await new Promise<unknown>((resolve, reject) => {
    lookup("example.com", { all: true }, (error, address, family) => {
      if (error) reject(error);
      else resolve({ address, family });
    });
  });

  assert.deepEqual(result, {
    address: [{ address: "203.0.113.10", family: 4 }],
    family: undefined,
  });
});

test("pinned DNS lookup returns one address when all is disabled", async () => {
  const lookup = createPinnedLookup({ address: "203.0.113.10", family: 4 });

  const result = await new Promise<unknown>((resolve, reject) => {
    lookup("example.com", { all: false }, (error, address, family) => {
      if (error) reject(error);
      else resolve({ address, family });
    });
  });

  assert.deepEqual(result, {
    address: "203.0.113.10",
    family: 4,
  });
});

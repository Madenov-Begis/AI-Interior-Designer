import assert from "node:assert/strict";
import test from "node:test";
import {
  namespaceRetryIdempotencyKey,
  parseRetryIdempotencyKey,
} from "./retry-policy.ts";

test("retry reservation keys are stable and scoped to the failed generation", () => {
  assert.equal(
    namespaceRetryIdempotencyKey(
      "550e8400-e29b-41d4-a716-446655440000",
      "client-attempt-1234567890",
    ),
    "retry:550e8400-e29b-41d4-a716-446655440000:client-attempt-1234567890",
  );
});

test("retry attempts require a validated client-stable idempotency header", () => {
  assert.throws(() => parseRetryIdempotencyKey(null));
  assert.throws(() => parseRetryIdempotencyKey("too-short"));
  assert.equal(
    parseRetryIdempotencyKey("  client-attempt-1234567890  "),
    "client-attempt-1234567890",
  );
});

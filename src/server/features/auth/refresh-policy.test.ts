import assert from "node:assert/strict";
import test from "node:test";
import { isRetryableAuthFailure } from "./refresh-policy.ts";

test("network, upstream outages and throttling preserve the session; invalid tokens expire it", () => {
  for (const status of [undefined, 0, 429, 500, 502, 503])
    assert.equal(isRetryableAuthFailure({ status }), true);
  for (const status of [400, 401, 403])
    assert.equal(isRetryableAuthFailure({ status }), false);
});

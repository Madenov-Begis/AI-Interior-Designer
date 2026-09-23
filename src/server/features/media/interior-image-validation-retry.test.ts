import assert from "node:assert/strict";
import test from "node:test";
import {
  getInteriorImageValidationFailureDetails,
  isRetryableInteriorImageValidationFailure,
} from "./interior-image-validation-retry.ts";

test("retries only transient Vertex AI failures", () => {
  for (const status of [429, 500, 502, 503, 504])
    assert.equal(
      isRetryableInteriorImageValidationFailure({ status }),
      true,
    );

  for (const status of [400, 401, 403, 404])
    assert.equal(
      isRetryableInteriorImageValidationFailure({ status }),
      false,
    );

  assert.equal(
    isRetryableInteriorImageValidationFailure(
      new Error("VERTEX_PROVIDER_NOT_CONFIGURED"),
    ),
    false,
  );
});

test("normalizes provider diagnostics before writing them to server logs", () => {
  assert.deepEqual(
    getInteriorImageValidationFailureDetails({
      status: 503,
      name: "ApiError",
      message: "upstream\n temporarily unavailable",
    }),
    {
      upstreamStatus: 503,
      upstreamName: "ApiError",
      upstreamMessage: "upstream temporarily unavailable",
    },
  );
});

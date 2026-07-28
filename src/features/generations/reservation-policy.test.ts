import assert from "node:assert/strict";
import test from "node:test";
import * as reservationPolicy from "./reservation-policy.ts";

test("selects the fake provider only for explicit local fake mode", () => {
  assert.equal(reservationPolicy.resolveRequiredProvider("fake"), "FAKE");
});

test("selects Vertex AI for the configured Gemini provider", () => {
  assert.equal(
    reservationPolicy.resolveRequiredProvider("vertex"),
    "VERTEX_AI",
  );
});

test("rejects an unsupported provider configuration", () => {
  assert.throws(
    () => reservationPolicy.resolveRequiredProvider("unknown"),
    /AI_PROVIDER_NOT_SUPPORTED/,
  );
});

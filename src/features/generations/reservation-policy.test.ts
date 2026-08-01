import assert from "node:assert/strict";
import test from "node:test";
import { GENERATION_CREDIT_COST } from "../../config/product.ts";
import * as reservationPolicy from "./reservation-policy.ts";

test("requires four available credits for a generation", () => {
  assert.equal(
    reservationPolicy.hasGenerationCredits(4, GENERATION_CREDIT_COST),
    true,
  );
  assert.equal(
    reservationPolicy.hasGenerationCredits(3, GENERATION_CREDIT_COST),
    false,
  );
});

test("maps insufficient credits to payment required in every generation route", () => {
  assert.equal(
    reservationPolicy.rootReservationHttpStatus("INSUFFICIENT_CREDITS"),
    402,
  );
  assert.equal(
    reservationPolicy.refinementReservationHttpStatus("INSUFFICIENT_CREDITS"),
    402,
  );
  assert.equal(
    reservationPolicy.retryReservationHttpStatus("INSUFFICIENT_CREDITS"),
    402,
  );
  assert.equal(
    reservationPolicy.retryReservationHttpStatus("GENERATION_ALREADY_RUNNING"),
    409,
  );
});

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

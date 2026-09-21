import assert from "node:assert/strict";
import test from "node:test";
import {
  authErrorUrl,
  decodeOAuthReturnState,
  encodeOAuthReturnState,
  isLocalDevelopmentOrigin,
  oauthCallbackUrl,
  safeReturnOrigin,
} from "./route-policy.ts";

const origins = [
  "https://www.ruvie.cc",
  "https://ruvie.cc",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].join(",");

test("returns only origins from the application allowlist", () => {
  assert.equal(
    safeReturnOrigin("http://localhost:3000", origins, "https://www.ruvie.cc"),
    "http://localhost:3000",
  );
  assert.equal(
    safeReturnOrigin("https://ruvie.cc/app", origins, "https://www.ruvie.cc"),
    "https://ruvie.cc",
  );
  assert.equal(
    safeReturnOrigin("https://evil.example", origins, "https://www.ruvie.cc"),
    "https://www.ruvie.cc",
  );
  assert.equal(
    safeReturnOrigin("not-a-url", origins, "https://www.ruvie.cc"),
    "https://www.ruvie.cc",
  );
  assert.equal(
    safeReturnOrigin(null, origins, "https://www.ruvie.cc"),
    "https://www.ruvie.cc",
  );
});

test("recognizes only HTTP localhost origins for the OAuth handoff", () => {
  assert.equal(isLocalDevelopmentOrigin("http://localhost:3000"), true);
  assert.equal(isLocalDevelopmentOrigin("http://127.0.0.1:3000"), true);
  assert.equal(isLocalDevelopmentOrigin("https://localhost:3000"), false);
  assert.equal(isLocalDevelopmentOrigin("https://www.ruvie.cc"), false);
});

test("uses an exact production OAuth callback from the Supabase allowlist", () => {
  assert.equal(
    oauthCallbackUrl("https://api.ruvie.cc").toString(),
    "https://api.ruvie.cc/auth/callback",
  );
});

test("uses an exact local OAuth callback from the Supabase allowlist", () => {
  assert.equal(
    oauthCallbackUrl("http://localhost:3000").toString(),
    "http://localhost:3000/auth/callback",
  );
});

test("round-trips the OAuth destination outside the callback URL", () => {
  const encoded = encodeOAuthReturnState(
    "/app/projects",
    "http://localhost:3000",
  );

  assert.deepEqual(decodeOAuthReturnState(encoded), {
    next: "/app/projects",
    returnOrigin: "http://localhost:3000",
  });
  assert.equal(decodeOAuthReturnState("not-valid-state"), null);
});

test("keeps OAuth start errors on the validated frontend origin", () => {
  assert.equal(
    authErrorUrl("http://localhost:3000", "legal_consent").toString(),
    "http://localhost:3000/login?error=legal_consent",
  );
  assert.equal(
    authErrorUrl("https://ruvie.cc", "oauth_start").toString(),
    "https://ruvie.cc/login?error=oauth_start",
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { startGoogleOAuth, verifyGoogleContext } from "./google-oauth.ts";
import { verifyAccessToken } from "./session-tokens.ts";

const config = {
  clientId: "test-google-client",
  clientSecret: "test-google-secret",
  callbackUrl: "https://api.example.invalid/auth/callback",
  sessionSecret: "test-session-secret".repeat(4),
  issuer: "https://app.example.invalid",
};

test("Google OAuth связывает PKCE, nonce, state и юридическое согласие", async () => {
  const now = Date.now();
  const start = await startGoogleOAuth(
    config,
    {
      next: "/app",
      returnOrigin: config.issuer,
      legalAcceptance: "privacy:offer",
    },
    now,
  );
  const url = new URL(start.url);
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("redirect_uri"), config.callbackUrl);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  const context = await verifyGoogleContext(
    config,
    start.cookie,
    url.searchParams.get("state"),
    now,
  );
  assert.equal(context.nonce, url.searchParams.get("nonce"));
  assert.equal(
    createHash("sha256").update(context.verifier).digest("base64url"),
    url.searchParams.get("code_challenge"),
  );
  assert.equal(context.legalAcceptance, "privacy:offer");
  await assert.rejects(
    verifyGoogleContext(config, start.cookie, "forged", now),
  );
  await assert.rejects(
    verifyGoogleContext(config, start.cookie, context.state, now + 601_000),
  );
  await assert.rejects(
    verifyAccessToken(start.cookie, config.sessionSecret, config.issuer, now),
  );
});

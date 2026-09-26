import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import {
  refreshToken,
  refreshSessionId,
  tokenHash,
  refreshDecision,
  signAccessToken,
  verifyAccessToken,
  REFRESH_GRACE_MS,
} from "./session-tokens.ts";

const secret = "test-session-secret".repeat(4);
const issuer = "https://app.example.invalid";

test("access JWT ограничен подписью, issuer, audience и временем", async () => {
  const id = randomUUID(),
    userId = randomUUID(),
    now = Date.now();
  const token = await signAccessToken(userId, id, secret, issuer, now, 60);
  assert.deepEqual(await verifyAccessToken(token, secret, issuer, now), {
    userId,
    sessionId: id,
  });
  await assert.rejects(
    verifyAccessToken(token, "wrong-secret".repeat(5), issuer, now),
  );
  await assert.rejects(
    verifyAccessToken(token, secret, "https://other.invalid", now),
  );
  await assert.rejects(verifyAccessToken(token, secret, issuer, now + 61_000));
  const [header, payload, signature] = token.split(".");
  const altered = `${header}.${payload}.${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}`;
  await assert.rejects(
    verifyAccessToken(altered, secret, issuer, now),
  );
});

test("конкурентный refresh получает тот же successor; просроченный повтор отзывает сессию", () => {
  const id = randomUUID(),
    now = Date.now();
  const previous = refreshToken(id, 0, secret),
    current = refreshToken(id, 1, secret);
  assert.equal(refreshSessionId(previous), id);
  assert.equal(refreshSessionId(`${id}.0.forged`), null);
  assert.notEqual(previous, current);
  assert.equal(current, refreshToken(id, 1, secret));
  const row = {
    refreshHash: tokenHash(current),
    previousRefreshHash: tokenHash(previous),
    previousValidUntil: new Date(now + REFRESH_GRACE_MS),
    expiresAt: new Date(now + 100_000),
    revokedAt: null,
  };
  assert.equal(refreshDecision(row, previous, now), "reuse");
  assert.equal(refreshDecision(row, current, now), "reuse");
  assert.equal(
    refreshDecision(row, previous, now + REFRESH_GRACE_MS),
    "revoke",
  );
  assert.equal(refreshDecision(row, current, now + REFRESH_GRACE_MS), "rotate");
  assert.equal(
    refreshDecision(row, refreshToken(id, 9, secret), now),
    "invalid",
  );
  assert.equal(
    refreshDecision({ ...row, revokedAt: new Date(now) }, current, now),
    "invalid",
  );
  assert.equal(refreshDecision(row, current, now + 100_000), "invalid");
});

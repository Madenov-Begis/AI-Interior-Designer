import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const ACCESS_SECONDS = 15 * 60;
export const SESSION_SECONDS = 30 * 86400;
export const REFRESH_GRACE_MS = 30_000;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function key(secret: string) {
  if (secret.length < 32) throw new Error("AUTH_SECRET_NOT_CONFIGURED");
  return new TextEncoder().encode(secret);
}
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function matchesHash(token: string, hash: string | null) {
  if (!hash || !/^[a-f0-9]{64}$/.test(hash)) return false;
  return timingSafeEqual(
    Buffer.from(tokenHash(token), "hex"),
    Buffer.from(hash, "hex"),
  );
}

// Непредсказуемый HMAC позволяет вернуть один и тот же successor при конкурентном
// refresh. В БД остаются только хеши; подпись отделена от JWT собственным контекстом.
export function refreshToken(id: string, version: number, secret: string) {
  if (!uuid.test(id) || !Number.isSafeInteger(version) || version < 0)
    throw new Error("INVALID_SESSION");
  return `${id}.${version}.${createHmac("sha256", key(secret)).update(`ruvie-refresh-v1:${id}:${version}`).digest("base64url")}`;
}
export function refreshSessionId(token: string) {
  const parts = token.split(".");
  return parts.length === 3 &&
    uuid.test(parts[0]) &&
    /^\d{1,10}$/.test(parts[1]) &&
    /^[\w-]{43}$/.test(parts[2])
    ? parts[0]
    : null;
}
export async function signAccessToken(
  userId: string,
  sessionId: string,
  secret: string,
  issuer: string,
  now: number,
  expiresIn = ACCESS_SECONDS,
) {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience("ruvie-api")
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor(now / 1000) + expiresIn)
    .sign(key(secret));
}
export async function verifyAccessToken(
  token: string,
  secret: string,
  issuer: string,
  now = Date.now(),
) {
  const { payload } = await jwtVerify(token, key(secret), {
    algorithms: ["HS256"],
    issuer,
    audience: "ruvie-api",
    currentDate: new Date(now),
  });
  if (
    typeof payload.sub !== "string" ||
    !uuid.test(payload.sub) ||
    typeof payload.sid !== "string" ||
    !uuid.test(payload.sid)
  )
    throw new Error("INVALID_ACCESS_TOKEN");
  return { userId: payload.sub, sessionId: payload.sid };
}

export type RefreshState = {
  refreshHash: string;
  previousRefreshHash: string | null;
  previousValidUntil: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
};
export function refreshDecision(
  state: RefreshState,
  token: string,
  now: number,
): "invalid" | "reuse" | "rotate" | "revoke" {
  if (state.revokedAt || state.expiresAt.getTime() <= now) return "invalid";
  const grace =
    state.previousValidUntil && state.previousValidUntil.getTime() > now;
  if (matchesHash(token, state.refreshHash)) return grace ? "reuse" : "rotate";
  if (matchesHash(token, state.previousRefreshHash))
    return grace ? "reuse" : "revoke";
  return "invalid";
}

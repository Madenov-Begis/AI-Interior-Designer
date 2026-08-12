import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_ACCESS_CODE_MIN_LENGTH = 5;
export const ADMIN_TOKEN_TTL_SECONDS = 8 * 60 * 60;

type AdminTokenPayload = {
  version: 1;
  subject: string;
  issuedAt: number;
  expiresAt: number;
};

export class AdminAuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAuthConfigError";
  }
}

function configuredAccessCode() {
  const value = process.env.ADMIN_ACCESS_CODE?.trim();
  if (!value || [...value].length < ADMIN_ACCESS_CODE_MIN_LENGTH)
    throw new AdminAuthConfigError(
      `ADMIN_ACCESS_CODE должен содержать минимум ${ADMIN_ACCESS_CODE_MIN_LENGTH} символов`,
    );
  return value;
}

function configuredTokenSecret() {
  const value = process.env.ADMIN_TOKEN_SECRET;
  if (!value || value.length < 32)
    throw new AdminAuthConfigError(
      "ADMIN_TOKEN_SECRET должен содержать минимум 32 символа",
    );
  return value;
}

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

export function matchesAdminAccessCode(value: string) {
  return timingSafeEqual(digest(value.trim()), digest(configuredAccessCode()));
}

export function issueAdminToken(subject: string, now = Date.now()) {
  const issuedAt = Math.floor(now / 1000);
  const payload: AdminTokenPayload = {
    version: 1,
    subject,
    issuedAt,
    expiresAt: issuedAt + ADMIN_TOKEN_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const token = `ra1.${encodedPayload}.${signature(encodedPayload, configuredTokenSecret())}`;
  return {
    token,
    expiresAt: new Date(payload.expiresAt * 1000).toISOString(),
    expiresIn: ADMIN_TOKEN_TTL_SECONDS,
  };
}

export function verifyAdminToken(token: string, now = Date.now()) {
  const [prefix, encodedPayload, receivedSignature, extra] = token.split(".");
  if (
    prefix !== "ra1" ||
    !encodedPayload ||
    !receivedSignature ||
    extra !== undefined
  )
    return null;

  const expectedSignature = signature(encodedPayload, configuredTokenSecret());
  const received = Buffer.from(receivedSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");
  if (received.length !== expected.length || !timingSafeEqual(received, expected))
    return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<AdminTokenPayload>;
    const current = Math.floor(now / 1000);
    if (
      payload.version !== 1 ||
      typeof payload.subject !== "string" ||
      !payload.subject ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      payload.issuedAt > current + 60 ||
      payload.expiresAt <= current
    )
      return null;
    return {
      subject: payload.subject,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}


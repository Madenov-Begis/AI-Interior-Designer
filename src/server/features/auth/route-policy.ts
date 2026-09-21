const PROTECTED_SEGMENTS = ["/app", "/admin"];
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export const OAUTH_RETURN_STATE_COOKIE = "ruvie_oauth_return_state";

export function isProtectedPath(pathname: string) {
  return PROTECTED_SEGMENTS.some(
    (segment) => pathname === segment || pathname.startsWith(`${segment}/`),
  );
}

export function safeReturnPath(value: string | null, fallback = "/app") {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    CONTROL_CHARACTERS.test(value)
  ) {
    return fallback;
  }
  return value;
}

export function safeReturnOrigin(
  value: string | null,
  configuredOrigins: string | undefined,
  fallback: string,
) {
  const fallbackOrigin = new URL(fallback).origin;
  if (!value || CONTROL_CHARACTERS.test(value)) return fallbackOrigin;

  let requestedOrigin: string;
  try {
    requestedOrigin = new URL(value).origin;
  } catch {
    return fallbackOrigin;
  }

  const allowedOrigins = new Set(
    (configuredOrigins ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  return allowedOrigins.has(requestedOrigin) ? requestedOrigin : fallbackOrigin;
}

export function isLocalDevelopmentOrigin(origin: string) {
  const url = new URL(origin);
  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  );
}

export function oauthCallbackUrl(requestOrigin: string) {
  return new URL("/auth/callback", requestOrigin);
}

export function encodeOAuthReturnState(next: string, returnOrigin: string) {
  return Buffer.from(
    JSON.stringify({ next: safeReturnPath(next), returnOrigin }),
    "utf8",
  ).toString("base64url");
}

export function decodeOAuthReturnState(value: string | undefined) {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("next" in parsed) ||
      !("returnOrigin" in parsed) ||
      typeof parsed.next !== "string" ||
      typeof parsed.returnOrigin !== "string"
    ) {
      return null;
    }
    return { next: parsed.next, returnOrigin: parsed.returnOrigin };
  } catch {
    return null;
  }
}

export function authErrorUrl(returnOrigin: string, error: string) {
  const errorUrl = new URL("/login", returnOrigin);
  errorUrl.searchParams.set("error", error);
  return errorUrl;
}

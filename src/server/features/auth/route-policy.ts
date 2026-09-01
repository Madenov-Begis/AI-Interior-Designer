const PROTECTED_SEGMENTS = ["/app", "/admin"];
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

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

export function oauthCallbackUrl(
  requestOrigin: string,
  next: string,
  returnOrigin: string,
) {
  const callbackUrl = new URL("/auth/callback", requestOrigin);

  // Production must use the exact URL configured in the Supabase redirect
  // allowlist. Local development keeps the cross-origin handoff parameters.
  if (isLocalDevelopmentOrigin(requestOrigin)) {
    callbackUrl.searchParams.set("next", safeReturnPath(next));
    callbackUrl.searchParams.set("returnOrigin", returnOrigin);
  }

  return callbackUrl;
}

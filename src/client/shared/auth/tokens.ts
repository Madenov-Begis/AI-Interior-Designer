"use client";

import Cookies from "js-cookie";

export const ACCESS_TOKEN_COOKIE = "ruvie_access_token";
export const REFRESH_TOKEN_COOKIE = "ruvie_refresh_token";

function cookieOptions(): Cookies.CookieAttributes {
  const configuredDomain = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
  const hostname =
    typeof window === "undefined" ? "" : window.location.hostname;
  const normalizedDomain = configuredDomain?.replace(/^\./, "");
  const domainMatches = Boolean(
    normalizedDomain &&
    (hostname === normalizedDomain ||
      hostname.endsWith(`.${normalizedDomain}`)),
  );

  return {
    path: "/",
    sameSite: "lax",
    secure:
      typeof window !== "undefined" && window.location.protocol === "https:",
    domain: domainMatches ? configuredDomain : undefined,
  };
}

function clearLegacySupabaseCookies() {
  for (const name of Object.keys(Cookies.get())) {
    if (name.startsWith("sb-") && name.includes("-auth-token")) {
      Cookies.remove(name, { path: "/" });
    }
  }
}

export function getAccessToken() {
  clearLegacySupabaseCookies();
  return Cookies.get(ACCESS_TOKEN_COOKIE) ?? null;
}

export function setAuthTokens({
  accessToken,
  expiresIn,
}: {
  accessToken: string;
  expiresIn: number;
}) {
  Cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...cookieOptions(),
    expires: new Date(Date.now() + Math.max(60, expiresIn) * 1_000),
  });
}

export function clearAuthTokens() {
  const options = cookieOptions();
  Cookies.remove(ACCESS_TOKEN_COOKIE, options);
  Cookies.remove(REFRESH_TOKEN_COOKIE, options);
  clearLegacySupabaseCookies();
}

export function consumeOAuthHandoff() {
  if (typeof window === "undefined" || !window.location.hash) return false;

  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("oauth_access_token");
  const expiresIn = Number(params.get("oauth_expires_in"));
  if (!accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0)
    return false;

  setAuthTokens({ accessToken, expiresIn });
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`,
  );
  return true;
}

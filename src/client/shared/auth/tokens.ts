"use client";

import Cookies from "js-cookie";

export const ACCESS_TOKEN_COOKIE = "roova_access_token";
export const REFRESH_TOKEN_COOKIE = "roova_refresh_token";

const COOKIE_OPTIONS: Cookies.CookieAttributes = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

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

export function getRefreshToken() {
  clearLegacySupabaseCookies();
  return Cookies.get(REFRESH_TOKEN_COOKIE) ?? null;
}

export function setAuthTokens({
  accessToken,
  refreshToken,
  expiresIn,
}: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) {
  Cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...COOKIE_OPTIONS,
    expires: new Date(Date.now() + Math.max(60, expiresIn) * 1_000),
  });
  Cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...COOKIE_OPTIONS,
    expires: 400,
  });
}

export function clearAuthTokens() {
  Cookies.remove(ACCESS_TOKEN_COOKIE, COOKIE_OPTIONS);
  Cookies.remove(REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS);
  clearLegacySupabaseCookies();
}
